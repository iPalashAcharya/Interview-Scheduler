const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const API_URL = 'http://localhost:3000'

let interviewMappings = [{
    id: 1,
    interviewer_id: 1,
    candidate_id: 1,
    slot_id: 1,
    interview_dateTime: 'random datetime',
    status: 'scheduled',
}]

router.get('/schedule/:id', async (req, res) => {
    const candidateId = parseInt(req.params.id);
    try {
        const [candidateRows] = await db.execute("SELECT candidate_id, d.name, rt.round_type FROM application LEFT JOIN interview_round rt ON application.stage_id=rt.id LEFT JOIN domain d ON application.applied_domain_id=d.id WHERE application.candidate_id=?;", [candidateId]);
        if (candidateRows.length === 0) {
            return res.status(404).json({ error: "Candidate Not Found" });
        }
        const candidate = candidateRows[0];
        const candidateDomain = candidate.name;
        const [appropriate_interviewers] = await db.execute("SELECT id.interviewer_id, i.name FROM interviewer_domain id LEFT JOIN domain d ON id.domain_id = d.id LEFT JOIN interviewer i ON id.interviewer_id = i.id WHERE d.name = ?;", [candidateDomain]);
        if (appropriate_interviewers.length === 0) {
            return res.json({ message: 'No appropriate interviewer found for the candidate' })
        }
        res.json(appropriate_interviewers);
    }
    catch (error) {
        console.log(error);
    }
});

//GET /recommend?candidates=1,2&stage=3
router.get('/recommend', async (req, res) => {
    try {
        const candidateIds = req.query.candidates.split(',').map(Number);
        const stageId = parseInt(req.query.stage);
        const candidateNumber = candidateIds.length;

        const [applications] = await db.execute(`
        SELECT a.candidate_id, a.applied_domain_id AS domain_id,
        ir.id AS round_type_id, ir.duration_minutes
        FROM application a
        JOIN interview_round ir ON ir.id = ?
        WHERE a.candidate_id IN (?)
        `, [stageId, candidateIds]);

        if (!applications.length) {
            return res.status(400).json({ error: 'Candidates do not share same round' });
        }

        const domainSet = new Set(applications.map(app => app.domain_id));
        if (domainSet.size > 1) {
            return res.status(400).json({
                error: 'Candidates do not share the same applied domain.'
            });
        }

        const bufferTime = 10;
        const duration = applications[0].duration_minutes;
        const interviewWithBuffer = duration + bufferTime;
        const domain = applications[0].domain_id;
        const round = applications[0].round_type_id;

        const [interviewers] = await db.execute(`
        SELECT i.id, i.name,
        SUM(
            FLOOR(
               TIMESTAMPDIFF(MINUTE, ts.slot_start, ts.slot_end) / ?
            )
        ) AS available_sessions
        FROM interviewer i
        JOIN interviewer_domain d ON d.interviewer_id=i.id AND d.domain_id=?
        JOIN interviewer_round  r ON r.interviewer_id=i.id AND r.round_type_id=?
        JOIN time_slot ts ON ts.user_id=i.id AND ts.slot_status = 'free'
        WHERE NOT EXISTS(
            SELECT 1 FROM interview_mapping im
            WHERE im.interviewer_id=i.id
            AND im.status IN ('scheduled','confirmed')
            AND im.slot_id = ts.id)
        GROUP BY i.id
        ORDER BY available_sessions DESC
        LIMIT 5;
        `, [interviewWithBuffer, domain, round]);
        let assignableInterviewers = [];
        let remainingCandidates = candidateNumber;

        for (const interviewer of interviewers) {
            if (remainingCandidates <= 0) break;
            assignableInterviewers.push(interviewer);
            remainingCandidates -= interviewer.available_sessions;
        }

        if (remainingCandidates > 0) {
            return res.status(400).json({
                error: 'Insufficient capacity to cover all candidates',
                needed: candidateNumber,
                available: candidateNumber - remainingCandidates
            });
        }

        res.json({
            interviewers: assignableInterviewers.map(i => ({
                interviewerId: i.id,
                name: i.name,
                capacity: i.available_sessions
            }))
        });

    } catch (error) {
        console.error("Error recommending interviewers:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/*router.post('/assign', async (req, res) => {
    const { interviewers, candidateIds, stageId } = req.body;
    const numCandidates = candidateIds.length;

    const [[round]] = await db.execute(`
    SELECT duration_minutes FROM interview_round WHERE id = ?
  `, [stageId]);
    const duration = round.duration_minutes;
    const bufferTime = 10;
    const sessionLength = duration + bufferTime;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [slots] = await conn.execute(`
        SELECT id, slot_start, slot_end
        FROM time_slot
        WHERE user_id = ?
        AND is_booked = FALSE
        ORDER BY slot_start
        FOR UPDATE
        `, [interviewerId]);

        let sessions = [];
        for (const slot of slots) {
            const slotStart = new Date(slot.slot_start);
            const slotEnd = new Date(slot.slot_end);
            let cursor = new Date(slotStart);

            while (cursor.getTime() + sessionLength * 60000 <= slotEnd.getTime()) {
                sessions.push({
                    slotId: slot.id,
                    start: new Date(cursor),
                    end: new Date(cursor.getTime() + duration * 60000)
                });
                cursor = new Date(cursor.getTime() + sessionLength * 60000);
                if (sessions.length >= numCandidates) break;
            }
            if (sessions.length >= numCandidates) break;
        }

        if (sessions.length < numCandidates) {
            throw new Error('Not enough available sessions to assign all candidates.');
        }
        for (let i = 0; i < numCandidates; i++) {
            const candidateId = candidateIds[i];
            const session = sessions[i];

            // Find application id for this candidate
            const [[appRow]] = await conn.execute(
                `SELECT id FROM application WHERE candidate_id = ? AND stage_id = ? LIMIT 1`,
                [candidateId, stageId]
            );

            if (!appRow) throw new Error('Application not found for candidate ' + candidateId);

            await conn.execute(`
            INSERT INTO interview_mapping
            (application_id, interviewer_id, slot_id, round_id, status)
            VALUES (?, ?, ?, ?, 'scheduled')
            `, [appRow.id, interviewerId, session.slotId, stageId]);

            await conn.execute(`UPDATE time_slot SET slot_status='tentative' WHERE id=?`, [session.slotId]);
        }
        await conn.commit();
        res.json({
            message: 'Tentative sessions assigned and dispatched.',
            assignments: sessions.map((s, i) => ({
                candidateId: candidateIds[i],
                slotId: s.slotId,
                session_start: s.start,
                session_end: s.end
            }))
        });

    } catch (error) {
        conn.rollback();
        console.error("Error recommending interviewers:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        conn.release();
    }
});*/

//request body
/*{
    "interviewers": [
        { "interviewerId": 3, "capacity": 3 },
        { "interviewerId": 5, "capacity": 2 }
    ],
        "candidateIds": [101, 102, 103, 104, 105],
            "stageId": 1
}*/
router.post("/assign", async (req, res) => {
    const { interviewers, candidateIds, stageId } = req.body;

    const [[round]] = await db.execute(
        `SELECT duration_minutes FROM interview_round WHERE id = ?`,
        [stageId]
    );
    const duration = round.duration_minutes;
    const bufferTime = 10;
    const sessionLength = duration + bufferTime;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let candidateQueue = [...candidateIds];
        const assignments = [];

        for (const { interviewerId, capacity } of interviewers) {
            if (candidateQueue.length === 0) {
                throw new Error(`No candidates provided`);
            }
            const [slots] = await conn.execute(
                `SELECT id, slot_start, slot_end
            FROM time_slot
            WHERE user_id = ? AND slot_status = 'free'
            ORDER BY slot_start
            FOR UPDATE`,
                [interviewerId]
            );

            let sessions = [];
            for (const slot of slots) {
                let cursor = new Date(slot.slot_start);
                const end = new Date(slot.slot_end);


                //continue assigning timeslots to candidates until the timeslot still has time
                while (cursor.getTime() + sessionLength * 60000 <= end.getTime()) {
                    sessions.push({
                        slotId: slot.id,
                        start: new Date(cursor),
                        end: new Date(cursor.getTime() + duration * 60000),
                    });
                    cursor = new Date(cursor.getTime() + sessionLength * 60000);
                    if (sessions.length >= capacity) break; //timeslot full
                }
                if (sessions.length >= capacity) break; //extra check
            }

            if (sessions.length < capacity && sessions.length < candidateQueue.length) {
                throw new Error(
                    `Not enough available sessions for interviewer ${interviewerId}`
                );
            }

            for (let i = 0; i < sessions.length && candidateQueue.length > 0; i++) {
                const candidateId = candidateQueue.shift();
                const session = sessions[i];

                const [[appRow]] = await conn.execute(
                    `SELECT id FROM application WHERE candidate_id = ? AND stage_id = ? LIMIT 1`,
                    [candidateId, stageId]
                );
                if (!appRow) throw new Error(`Application not found for candidate ${candidateId}`);

                const [interviewMapping] = await conn.execute(
                    `INSERT INTO interview_mapping
                (application_id, interviewer_id, slot_id, round_id, status)
                VALUES (?, ?, ?, ?, 'scheduled')`,
                    [appRow.id, interviewerId, session.slotId, stageId]
                );

                await conn.execute(
                    `UPDATE time_slot SET slot_status = 'tentative' WHERE id = ?`,
                    [session.slotId]
                );

                await conn.execute(
                    `INSERT INTO interview_session
                    (slot_id,mapping_id,session_start,session_end)
                    VALUES(? ? ? ?)`,
                    [session.slotId, interviewMapping.insertId, session.start, session.end]);
                assignments.push({
                    candidateId,
                    interviewerId,
                    slotId: session.slotId,
                    session_start: session.start,
                    session_end: session.end,
                });
            }
        }

        if (candidateQueue.length > 0) {
            throw new Error(`Could not assign ${candidateQueue.length} candidates due to insufficient capacity.`);
        }

        await conn.commit();
        res.json({
            message: "Tentative sessions assigned and dispatched.",
            assignments,
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error assigning sessions:", error);
        res.status(500).json({ error: error.message });
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