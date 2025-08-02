const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireAuth } = require('../config/passport');

router.get('/', requireAdmin, async (req, res) => {
    //const [candidates] = await db.execute("SELECT a.candidate_id,a.application_number,a.name,a.phone,a.email,a.current_location,a.status,a.stage_id, ir.name, jop.title AS job_role,i.name AS interviewer_assigned FROM application a LEFT JOIN job_opening jop ON a.applied_domain_id=jop.id LEFT JOIN interview_round ir ON a.stage_id=ir.id LEFT JOIN interview_mapping im ON im.application_id=a.id LEFT JOIN interviewer i ON i.id=im.interviewer_id WHERE a.status='shortlisted'"); //square brackets to just get the actual data and not the metadata about the fields
    const [candidates] = await db.execute("SELECT c.id,a.application_number,c.name AS candidate_name,c.phone,c.email,c.current_country,c.address,a.status,a.stage_id, ir.name, jop.title AS job_role,i.name AS interviewer_assigned FROM candidate c LEFT JOIN application a ON a.candidate_id=c.id LEFT JOIN job_opening jop ON a.applied_domain_id=jop.id LEFT JOIN interview_round ir ON a.stage_id=ir.id LEFT JOIN interview_mapping im ON im.application_id=a.id LEFT JOIN interviewer i ON i.id=im.interviewer_id");
    for (const candidate of candidates) {
        if (candidate.status === "shortlisted") {
            candidate.status = "pending";
        }
    }
    res.json(candidates);
});

router.get('/:id', requireAdmin, async (req, res) => {
    const candidateId = req.params.id;
    //const [candidate] = await db.execute("SELECT a.candidate_id, a.application_number, a.name, a.phone, a.email, a.current_location, a.status,a.skills,a.applied_at,ir.name, jop.title AS job_role, i.name AS interviewer_assigned, c.resume_url, s.session_start AS interview_date FROM application a LEFT JOIN job_opening jop ON a.applied_domain_id = jop.id LEFT JOIN interview_round ir ON a.stage_id = ir.id LEFT JOIN interview_mapping im ON im.application_id = a.id LEFT JOIN interviewer i ON i.id = im.interviewer_id LEFT JOIN interview_session s ON s.mapping_id=im.id LEFT JOIN candidate c on a.candidate_id=c.id WHERE a.candidate_id=?", [candidateId]);
    const [candidate] = await db.execute("SELECT c.id,a.application_number,c.name AS candidate_name,c.phone,c.email,c.current_country,c.address,a.status,c.skills,a.applied_at,ir.name,jop.title AS job_role,i.name AS interviewer_assigned, c.resume_url, s.session_start AS interview_date FROM candidate c LEFT JOIN application a ON a.candidate_id=c.id LEFT JOIN job_opening jop ON a.applied_domain_id=jop.id LEFT JOIN interview_round ir ON a.stage_id = ir.id LEFT JOIN interview_mapping im ON im.application_id=a.id LEFT JOIN interviewer i on i.id=im.interviewer_id LEFT JOIN interview_session s ON s.mapping_id=im.id WHERE c.id=?", [candidateId]);
    if (candidate.status === "shortlisted") {
        candidate.status = "pending";
    }
    res.json(candidate);
});

router.post('/', requireAuth, async (req, res) => {
    const candidateDetails = req.body;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [existRows] = await client.execute(
            "SELECT id FROM candidate WHERE id = ?", [req.user.id]
        );
        if (existRows.length > 0) {
            await client.rollback();
            return res.status(409).json({ error: "Candidate details already exists for this user." });
        }

        await client.execute('INSERT INTO candidate(id,name,phone,email,linkedin_url,resume_url,github_url,current_country,address,skills) VALUES(?,?,?,?,?,?,?,?,?,?)', [req.user.id, candidateDetails.name, candidateDetails.phone, candidateDetails.email, candidateDetails.linkedinUrl, candidateDetails.resumeUrl, candidateDetails.githubUrl, candidateDetails.currentCountry, candidateDetails.address, candidateDetails.skills]);

        await client.commit();

        res.json({
            message: 'Candidate Details saved'
        });
    } catch (error) {
        await client.rollback();
        console.error("Candidate upload details error:", error.message);
        res.status(409).json({ error: error.message });
    } finally {
        client.release();
    }
});

router.get('/profile', requireAuth, async (req, res) => {
    const client = await db.getConnection();
    try {
        const [rows] = await client.execute(
            `SELECT id, name, phone, email, linkedin_url, resume_url, github_url, current_country, address, skills
       FROM candidate WHERE id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Candidate details not found." });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching candidate details:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.get('/:candidateId/available-sessions', requireAuth, async (req, res) => {
    const candidateId = req.user.id;

    try {
        // Get all mappings for this candidate that haven't been confirmed yet
        const [mappings] = await db.execute(
            `SELECT im.id as mapping_id, im.interviewer_id, i.name as interviewer_name,
                    im.status as mapping_status, im.candidate_confirmed
             FROM interview_mapping im
             JOIN application a ON a.id = im.application_id
             JOIN interviewer i ON i.id = im.interviewer_id
             WHERE a.candidate_id = ? AND im.status = 'scheduled' AND im.candidate_confirmed = FALSE`,
            [candidateId]
        );

        const availableOptions = [];

        for (const mapping of mappings) {
            // Get available free sessions for this interviewer
            const [slots] = await db.execute(
                `SELECT id, slot_start, slot_end
                 FROM time_slot
                 WHERE user_id = ? AND is_active = TRUE AND slot_end > NOW()
                 ORDER BY slot_start`,
                [mapping.interviewer_id]
            );

            let allFreeSessions = [];
            for (const slot of slots) {
                const [sessions] = await db.execute(
                    `SELECT id AS session_id, slot_id, session_start, session_end
                     FROM interview_session
                     WHERE slot_id = ?
                       AND status = 'free'  
                       AND mapping_id IS NULL
                     ORDER BY session_start`,
                    [slot.id]
                );
                allFreeSessions.push(...sessions);
            }

            // Sort by session_start and limit to reasonable number
            allFreeSessions.sort((a, b) => new Date(a.session_start) - new Date(b.session_start));
            const availableSessions = allFreeSessions.slice(0, 8); // Show up to 8 options

            if (availableSessions.length > 0) {
                availableOptions.push({
                    mappingId: mapping.mapping_id,
                    interviewerId: mapping.interviewer_id,
                    interviewerName: mapping.interviewer_name,
                    availableSessions: availableSessions
                });
            }
        }

        res.json({ candidateId, availableOptions });
    } catch (error) {
        console.error('Error fetching available sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/slot-choice', requireAuth, async (req, res) => {
    const candidateId = req.user.id;
    const { mappingId, sessionId } = req.body;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Verify mapping exists AND belongs to candidate
        const [[mapping]] = await conn.execute(`
            SELECT im.id, im.interviewer_id, im.slot_id, a.candidate_id
            FROM interview_mapping im
            JOIN application a ON a.id = im.application_id
            WHERE im.id = ? AND a.candidate_id = ? AND im.candidate_confirmed = FALSE
            FOR UPDATE
        `, [mappingId, candidateId]);

        if (!mapping) {
            throw new Error("Invalid mapping, unauthorized candidate, or already confirmed.");
        }

        // 2. Verify session exists and is available
        const [[session]] = await conn.execute(`
            SELECT s.id, s.slot_id, s.session_start, s.session_end, s.status, s.mapping_id
            FROM interview_session s
            WHERE s.id = ?
            FOR UPDATE
        `, [sessionId]);

        if (!session) {
            throw new Error("Session not found.");
        }

        if (session.status !== 'free' || session.mapping_id !== null) {
            throw new Error("This time slot is no longer available. Please choose another slot.");
        }

        // 3. Record candidate's choice (audit)
        await conn.execute(`
            INSERT INTO candidate_slot_choice
            (mapping_id, candidate_id, slot_id, session_start, session_end)
            VALUES (?, ?, ?, ?, ?)
        `, [
            mappingId,
            candidateId,
            session.slot_id,
            session.session_start,
            session.session_end,
        ]);

        // 4. Book the session for this candidate
        await conn.execute(`
            UPDATE interview_session
            SET status = 'booked', mapping_id = ?
            WHERE id = ? AND status = 'free' AND mapping_id IS NULL
        `, [mappingId, sessionId]);

        // 5. Update the mapping's slot_id to match the chosen session
        await conn.execute(`
            UPDATE interview_mapping
            SET slot_id = ?, candidate_confirmed = TRUE,
                status = CASE WHEN interviewer_confirmed = TRUE THEN 'confirmed' ELSE 'scheduled' END
            WHERE id = ?
        `, [session.slot_id, mappingId]);

        // 6. Update application status if both candidate and interviewer confirmed
        await conn.execute(`
            UPDATE application
            SET status = 'interview_scheduled'
            WHERE id = (
                SELECT application_id FROM interview_mapping WHERE id = ?
            )
            AND EXISTS (
                SELECT 1 FROM interview_mapping
                WHERE id = ? AND candidate_confirmed = TRUE AND interviewer_confirmed = TRUE
            )
        `, [mappingId, mappingId]);

        await conn.commit();
        res.json({
            message: 'Session confirmed. Waiting for interviewer confirmation.',
            session: {
                sessionId: sessionId,
                start: session.session_start,
                end: session.session_end,
                status: "booked"
            }
        });
    } catch (err) {
        await conn.rollback();
        console.error("Candidate slot choice error:", err.message);
        res.status(409).json({ error: err.message });
    } finally {
        conn.release();
    }
});

/*router.put('/:id/status', (req, res) => {
    const candidateId = req.params.id;
    const status = req.body.status;
    let candidate = candidates.find(candidate => candidate.id === candidateId);
    candidate.status = status;
    res.status(201).send(`Status Updated to ${status}`);
});*/

module.exports = router;