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

router.post('/candidates/:candidateId/slot-choice', async (req, res) => {
    const candidateId = parseInt(req.params.candidateId);
    const { mappingId, slotId } = req.body;

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

        const [[slot]] = await conn.execute(
            `SELECT slot_status FROM time_slot WHERE id = ? FOR UPDATE`,
            [slotId]
        );

        if (!slot) throw new Error("Selected time slot does not exist.");
        if (slot.slot_status !== "tentative") {
            throw new Error("Time slot is no longer available.");
        }
        // 3. Assign slot to mapping — treat this as confirmation
        await conn.execute(`
        UPDATE interview_mapping
        SET slot_id = ?, status = 'confirmed', candidate_confirmed = TRUE
        WHERE id = ?
        `, [slotId, mappingId]);

        // 4. Mark the slot as booked
        await conn.execute(
            `UPDATE time_slot SET slot_status = 'booked' WHERE id = ?`,
            [slotId]
        );

        await conn.commit();

        res.json({ message: 'Slot confirmed. Interview scheduled.' });
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