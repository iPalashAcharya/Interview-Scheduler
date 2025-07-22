const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    const [candidates] = await db.query("SELECT * FROM candidate LEFT JOIN users ON users.id=candidate.id"); //square brackets to just get the actual data and not the metadata about the fields
    res.json(candidates);
});

router.get('/:id', async (req, res) => {
    const candidateId = req.params.id;
    const [candidate] = await db.query("SELECT * FROM candidate LEFT JOIN users ON users.id=candidate.id WHERE candidate.id=?", [candidateId]);
    res.json(candidate);
});
//request body
/*{
  "mappingId": 42,
  "sessionId": 90
}*/
router.post('/candidates/:candidateId/slot-choice', async (req, res) => {
    const candidateId = parseInt(req.params.candidateId);
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