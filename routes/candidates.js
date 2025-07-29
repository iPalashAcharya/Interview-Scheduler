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
            "SELECT id FROM candidate WHERE user_id = ?", [req.user.id]
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
        console.error("Candidate slot choice error:", error.message);
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

//request body
/*{
  "mappingId": 42,
  "sessionId": 90
}*/
router.post('/candidates/slot-choice', requireAuth, async (req, res) => {
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
        WHERE im.id = ? AND a.candidate_id = ?
        `, [mappingId, candidateId]);

        if (!mapping) {
            throw new Error("Invalid mapping or unauthorized candidate.");
        }

        const [[session]] = await conn.execute(`
        SELECT s.id, s.slot_id, s.session_start, s.session_end, ts.slot_status
        FROM interview_session s
        JOIN time_slot ts ON ts.id = s.slot_id
        WHERE s.id = ? AND s.mapping_id = ?
        FOR UPDATE
        `, [sessionId, mappingId]);

        if (!session) throw new Error("Selected session not found.");
        if (session.slot_status !== "tentative") {
            throw new Error("Session slot is no longer available.");
        }

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

        await conn.execute(`
        UPDATE interview_mapping
        SET status = 'confirmed', candidate_confirmed = TRUE
        WHERE id = ?
        `, [mappingId]);

        // 4. Mark time slot as booked
        await conn.execute(`
        UPDATE time_slot SET slot_status = 'booked' WHERE id = ?
        `, [session.slot_id]);

        await conn.commit();

        res.json({
            message: 'Session confirmed. Interview scheduled.',
            session: {
                sessionId: sessionId,
                start: session.session_start,
                end: session.session_end
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