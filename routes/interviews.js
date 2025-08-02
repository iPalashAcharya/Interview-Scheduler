const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');
const { requireAdmin } = require('../config/passport');
const API_URL = 'http://localhost:3000'

router.get('/recommend/:candidateId', requireAdmin, async (req, res) => {
    const candidateId = parseInt(req.params.candidateId);

    try {
        const [[candidate]] = await db.execute(`
        SELECT a.candidate_id, d.id AS domain_id, d.name AS domain_name,
            ir.id AS round_id, ir.round_type,ir.duration_minutes
        FROM application a
        JOIN domain d ON a.applied_domain_id = d.id
        JOIN interview_round ir ON a.stage_id = ir.id
        WHERE a.candidate_id = ?
        `, [candidateId]);

        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found or no round assigned." });
        }

        const { domain_id, round_id, duration_minutes } = candidate;
        const bufferTime = 10;
        const sessionLength = duration_minutes + bufferTime;

        const [interviewers] = await db.execute(`
        SELECT i.id AS interviewerId, i.name
        FROM interviewer i
        JOIN interviewer_domain d ON d.interviewer_id = i.id AND d.domain_id = ?
        JOIN interviewer_round r ON r.interviewer_id = i.id AND r.round_type_id = ?
        `, [domain_id, round_id]);

        const recommendations = [];

        for (const interviewer of interviewers) {
            const [slots] = await db.execute(`
            SELECT id, slot_start, slot_end
            FROM time_slot
            WHERE user_id = ? AND is_active = TRUE AND slot_end > NOW()
            `, [interviewer.interviewerId]);

            // fetch occupied sessions
            const [busy] = await db.execute(`
            SELECT session_start, session_end
            FROM interview_session s
            JOIN interview_mapping m ON m.id = s.mapping_id
            WHERE m.interviewer_id = ? AND m.status IN ('scheduled','confirmed')
            `, [interviewer.interviewerId]);
            let totalFreeMinutes = 0;
            for (const slot of slots) {
                // build list of busy intervals within this slot
                const intervals = busy
                    .map(b => ({
                        start: new Date(b.session_start),
                        end: new Date(b.session_end),
                    }))
                    .filter(b => b.end > slot.slot_start && b.start < slot.slot_end)
                    .sort((a, b) => a.start - b.start);

                let cursor = new Date(slot.slot_start);
                const slotEnd = new Date(slot.slot_end);

                //Walk through the slot’s timeline, subtracting those busy intervals
                for (const b of intervals) {
                    // Add any free period before the busy interval
                    if (cursor < b.start) {
                        totalFreeMinutes += (b.start - cursor) / 60000;
                    }
                    // Move cursor past the busy interval
                    if (b.end > cursor) {
                        cursor = b.end;
                    }
                }
                // Finally, add any free period after the last busy interval
                if (cursor < slotEnd) {
                    totalFreeMinutes += (slotEnd - cursor) / 60000;
                }
                const availableSessions = Math.floor(totalFreeMinutes / sessionLength);
                if (availableSessions > 0) {
                    recommendations.push({
                        interviewerId: interviewer.interviewerId,
                        name: interviewer.name,
                        availableSessions
                    });
                }
            }
        }
        recommendations
            .sort((a, b) => b.availableSessions - a.availableSessions);
        const top5 = recommendations.slice(0, 5);

        res.json({
            candidate: { id: candidateId, domain: domain_id, round: round_id },
            recommendedInterviewers: top5
        });
    } catch (error) {
        console.error("Error in /recommend/:candidateId →", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
//POST /recommend
router.post('/recommend', requireAdmin, async (req, res) => {
    try {
        const candidateIds = req.body.candidates.split(',').map(Number);
        const stageId = parseInt(req.body.stage);
        const candidateNumber = candidateIds.length;

        const placeholders = candidateIds.map(() => '?').join(','); // safely handles any number of candidates
        const sql = `
        SELECT a.candidate_id, a.applied_domain_id AS domain_id,
                ir.id AS round_type_id, ir.duration_minutes
        FROM application a
        JOIN interview_round ir ON ir.id = ?
        WHERE a.candidate_id IN (${placeholders})`;

        const [applications] = await db.execute(sql, [stageId, ...candidateIds]);

        if (!applications.length) {
            return res.status(400).json({ error: 'Candidates do not share same round' });
        }

        const domainSet = new Set(applications.map(app => app.domain_id));
        if (domainSet.size > 1) {
            return res.status(400).json({
                error: 'Candidates do not share the same applied domain.'
            });
        }

        const { domain_id, round_type_id, duration_minutes } = applications[0];
        const bufferTime = 10;
        const sessionLength = duration_minutes + bufferTime;
        const [interviewers] = await db.execute(
            `SELECT i.id AS interviewerId, i.name
         FROM interviewer i
         JOIN interviewer_domain d ON d.interviewer_id = i.id AND d.domain_id = ?
         JOIN interviewer_round r ON r.interviewer_id = i.id AND r.round_type_id = ?`,
            [domain_id, round_type_id]
        );
        const recommendations = [];
        for (const interviewer of interviewers) {
            const [slots] = await db.execute(
                `SELECT id, slot_start, slot_end
                FROM time_slot
                WHERE user_id = ? AND is_active = TRUE AND slot_end > NOW()
                ORDER BY slot_start`,
                [interviewer.interviewerId]
            );

            const [busy] = await db.execute(`SELECT s.session_start,s.session_end
                FROM interview_session s
                JOIN interview_mapping m ON m.id=s.mapping_id
                WHERE m.interviewer_id=? AND m.status IN ('scheduled','confirmed')
                ORDER BY s.session_start`, [interviewer.interviewerId]);
            let totalFreeMinutes = 0;
            for (const slot of slots) {
                // Overlapping busy intervals
                const intervals = busy
                    .map(b => ({ start: new Date(b.session_start), end: new Date(b.session_end) }))
                    .filter(b => b.end > slot.slot_start && b.start < slot.slot_end)
                    .sort((a, b) => a.start - b.start);

                let cursor = new Date(slot.slot_start);
                const slotEnd = new Date(slot.slot_end);

                for (const b of intervals) {
                    if (cursor < b.start) {
                        totalFreeMinutes += (b.start - cursor) / 60000;
                    }
                    if (b.end > cursor) {
                        cursor = b.end;
                    }
                }
                if (cursor < slotEnd) {
                    totalFreeMinutes += (slotEnd - cursor) / 60000;
                }
            }

            const availableSessions = Math.floor(totalFreeMinutes / sessionLength);
            if (availableSessions > 0) {
                recommendations.push({
                    interviewerId: interviewer.interviewerId,
                    name: interviewer.name,
                    availableSessions
                });
            }
        }

        recommendations.sort((a, b) => b.availableSessions - a.availableSessions);
        const assignable = [];
        let remaining = candidateNumber;

        for (const rec of recommendations) {
            if (remaining <= 0) break;
            const assigned = Math.min(rec.availableSessions, remaining);
            assignable.push({ ...rec, assignedCapacity: assigned });
            remaining -= assigned;
        }

        res.json({
            fullCoverage: remaining <= 0,
            needed: candidateNumber,
            coverage: candidateNumber - remaining,
            interviewers: assignable
        });

    } catch (error) {
        console.error("Error recommending interviewers for multiple candidates:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/assign', requireAdmin, async (req, res) => {
    const { interviewers, candidateIds, stageId } = req.body;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1) Fetch round duration + buffer
        const [[round]] = await conn.execute(
            'SELECT duration_minutes FROM interview_round WHERE id = ?',
            [stageId]
        );
        if (!round) throw new Error(`Round ${stageId} not found`);
        const sessionLength = round.duration_minutes + 10;

        const candidateQueue = [...candidateIds];
        const assignments = [];

        for (const { interviewerId, assignedCapacity } of interviewers) {
            if (candidateQueue.length === 0) break;

            // 2) Load active slots
            const [slots] = await conn.execute(
                `SELECT id, slot_start, slot_end
                 FROM time_slot
                 WHERE user_id = ? AND is_active = TRUE AND slot_end > NOW()
                 ORDER BY slot_start`,
                [interviewerId]
            );
            if (slots.length === 0) continue;

            const slotIds = slots.map(s => s.id);
            if (slotIds.length === 0) continue;

            // 3) Count existing sessions for each slot
            let totalExistingSessions = 0;
            for (const slotId of slotIds) {
                const [countRow] = await conn.execute(
                    `SELECT COUNT(*) AS cnt
                     FROM interview_session
                     WHERE slot_id = ?`,
                    [slotId]
                );
                totalExistingSessions += countRow[0].cnt;
            }

            // 4) Create ALL possible sessions if none exist
            if (totalExistingSessions === 0) {
                for (const slot of slots) {
                    let cursor = new Date(slot.slot_start);
                    const slotEnd = new Date(slot.slot_end);
                    while (cursor.getTime() + sessionLength * 60000 <= slotEnd.getTime()) {
                        const sStart = cursor.toISOString().slice(0, 19).replace('T', ' ');
                        cursor = new Date(cursor.getTime() + sessionLength * 60000);
                        const sEnd = cursor.toISOString().slice(0, 19).replace('T', ' ');
                        await conn.execute(
                            `INSERT INTO interview_session
                             (slot_id, session_start, session_end, status)
                             VALUES (?, ?, ?, 'free')`,
                            [slot.id, sStart, sEnd]
                        );
                    }
                }
            }

            // 5) Get all free sessions for this interviewer
            let allFreeSessions = [];
            for (const slotId of slotIds) {
                const [sessions] = await conn.execute(
                    `SELECT id AS session_id, slot_id, session_start, session_end
                     FROM interview_session
                     WHERE slot_id = ?
                       AND status = 'free'  
                       AND mapping_id IS NULL
                     ORDER BY session_start`,
                    [slotId]
                );
                allFreeSessions.push(...sessions);
            }

            // Sort by session_start
            allFreeSessions.sort((a, b) => new Date(a.session_start) - new Date(b.session_start));

            if (allFreeSessions.length === 0) {
                throw new Error(`Interviewer ${interviewerId}: no free sessions available`);
            }

            // 6) Assign candidates to this interviewer 
            for (let i = 0; i < assignedCapacity && candidateQueue.length > 0; i++) {
                const candidateId = candidateQueue.shift();

                const [[app]] = await conn.execute(
                    `SELECT id FROM application WHERE candidate_id = ? AND stage_id = ?`,
                    [candidateId, stageId]
                );
                if (!app) throw new Error(`No application for candidate ${candidateId}`);

                // Create mapping without linking to specific sessions yet
                const [mapRes] = await conn.execute(
                    `INSERT INTO interview_mapping
                     (application_id, interviewer_id, slot_id, round_id, status)
                     VALUES (?, ?, ?, ?, 'scheduled')`,
                    [app.id, interviewerId, slotIds[0], stageId] // Use first slot as reference
                );
                const mappingId = mapRes.insertId;

                // Give this candidate access to choose from available sessions
                // We'll store this in a separate table or use the existing sessions
                const sessionsToOffer = Math.min(5, allFreeSessions.length);
                const availableSessions = allFreeSessions.slice(0, sessionsToOffer).map(session => ({
                    sessionId: session.session_id,
                    start: session.session_start,
                    end: session.session_end
                }));

                assignments.push({
                    candidateId,
                    interviewerId,
                    mappingId,
                    availableSessions
                });
            }
        }

        if (candidateQueue.length > 0) {
            throw new Error(
                `Could not assign ${candidateQueue.length} candidates due to insufficient capacity`
            );
        }

        await conn.commit();
        res.json({
            message: 'Candidates assigned to interviewers. Candidates can now choose their preferred time slots.',
            assignments
        });
    } catch (err) {
        await conn.rollback();
        console.error('POST /assign error →', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

router.post('/', (req, res) => {
    const interviewMapping = req.body;
    interviewMappings.push(interviewMapping);
    res.status(201).send("Scheduled the interview");
});

router.get('/', (req, res) => {
    res.json(interviewMappings);
});

router.get('/:id', (req, res) => {
    const interviewId = req.params.id;
    const interview = interviewMappings.find(interview => interview.id === interviewId);
    res.json(interview);
});

module.exports = router;