const express = require('express');
const db = require('../db');
const { requireAdmin, requireAuth } = require('../config/passport');
const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
    const [interviewers] = await db.query("SELECT i.id,i.name,i.phone,r.id AS interviewer_round_type_id,r.name AS interviewer_round_type_name,id.domain_id AS interviewer_domain_id,id.proficiency_level,d.name AS interviewer_domain_name FROM interviewer i LEFT JOIN interviewer_round ir ON i.id=ir.interviewer_id LEFT JOIN interview_round r ON ir.round_type_id=r.id LEFT JOIN interviewer_domain id ON i.id=id.interviewer_id LEFT JOIN domain d ON id.domain_id=d.id");
    res.json(interviewers);
});

router.post('/', requireAuth, async (req, res) => {
    const interviewer = req.body;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();
        interviewer.name = `${interviewer.firstName.toLowerCase().charAt(0).toUpperCase() + interviewer.firstName.toLowerCase().slice(1)} ${interviewer.lastName.toLowerCase().charAt(0).toUpperCase() + interviewer.lastName.toLowerCase().slice(1)}`;
        await client.execute(`UPDATE interviewer SET name=?,phone=? WHERE id=?`, [interviewer.name, interviewer.phone, req.user.id]);
        await client.execute(`DELETE FROM interviewer_domain WHERE interviewer_id = ?`, [req.user.id]);
        await client.execute(`DELETE FROM interviewer_round WHERE interviewer_id = ?`, [req.user.id]);
        for (const domain of interviewer.domains) {
            const [domainRows] = await client.execute(`SELECT id FROM domain WHERE name=?`, [domain]);
            if (domainRows.length === 0) {
                await client.rollback();
                return res.status(400).json({ error: `Domain not found${domain.name}` });
            }
            const domainRowId = domainRows[0].id;
            await client.execute(`INSERT INTO interviewer_domain(interviewer_id,domain_id,proficiency_level) VALUES(?,?,?)`, [req.user.id, domainRowId, domain.proficiencyLevel.toLowerCase()]);
        }
        for (const round of interviewer.rounds) {
            const [roundRows] = await client.execute(`SELECT id FROM interview_round WHERE name=?`, [round]);
            if (roundRows.length === 0) {
                await client.rollback();
                return res.status(400).json({ error: "Domain not found" });
            }
            const roundRowId = roundRows[0].id;
            await client.execute(`INSERT INTO interviewer_round(interviewer_id,round_type_id) VALUES(?,?)`, [req.user.id, roundRowId]);
        }
        await client.commit();
        res.status(201).json({
            message: 'Interviewer details saved'
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
    const userId = req.user.id;
    const client = await db.getConnection();

    try {
        const [interviewerRows] = await client.execute(
            `SELECT id, name, phone FROM interviewer WHERE id = ?`,
            [userId]
        );

        if (interviewerRows.length === 0) {
            return res.status(404).json({ error: 'Interviewer profile not found' });
        }
        const interviewer = interviewerRows[0];

        const [domainRows] = await client.execute(
            `SELECT d.name AS domainName, id.proficiency_level AS proficiencyLevel
       FROM interviewer_domain id 
       JOIN domain d ON id.domain_id = d.id
       WHERE id.interviewer_id = ?`,
            [userId]
        );
        const [roundRows] = await client.execute(
            `SELECT ir.name AS roundType
       FROM interviewer_round i_r
       JOIN interview_round ir ON i_r.round_type_id = ir.id
       WHERE i_r.interviewer_id = ?`,
            [userId]
        );

        res.status(200).json({
            id: interviewer.id,
            name: interviewer.name,
            phone: interviewer.phone,
            domains: domainRows.map(d => ({
                domainName: d.domainName,
                proficiencyLevel: d.proficiencyLevel,
            })),
            rounds: roundRows.map(r => r.roundType),
        });
    } catch (error) {
        console.error("Error fetching interviewer profile:", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

router.get('/mappings/:id', requireAuth, async (req, res) => {
    /*if (req.user.role !== 'Interviewer') {
        return res.status(403).json({ error: 'Access denied: interviewer only' });
    }*/
    const interviewerId = req.params.id;

    const client = await db.getConnection();
    try {
        const [rows] = await db.execute(
            `SELECT m.id as mappingId, a.candidate_id, s.id as sessionId, s.session_start, s.session_end, s.status, m.status as mappingStatus
      FROM interview_mapping m
      JOIN application a ON m.application_id = a.id
      JOIN interview_session s ON s.mapping_id = m.id
      WHERE m.interviewer_id = ?
      ORDER BY s.session_start`,
            [interviewerId]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching interviewer mappings:", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});


router.post('/confirm-session', requireAuth, async (req, res) => {
    const interviewerId = req.user.id;
    const { mappingId, sessionId } = req.body;

    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [[mapping]] = await client.execute(`
            SELECT im.id, im.application_id, im.interviewer_id, im.slot_id, im.status
            FROM interview_mapping im
            WHERE im.id = ? AND im.interviewer_id = ?
            FOR UPDATE
        `, [mappingId, interviewerId]);

        if (!mapping) {
            throw new Error("Invalid mapping or unauthorized interviewer.");
        }

        const [[session]] = await client.execute(`
            SELECT s.id, s.slot_id, s.session_start, s.session_end, s.status
            FROM interview_session s
            WHERE s.id = ? AND s.mapping_id = ?
            FOR UPDATE
        `, [sessionId, mappingId]);

        if (!session) {
            throw new Error("Session not found for this mapping.");
        }

        if (session.status !== "booked") {
            throw new Error("Session is not in a confirmable state.");
        }

        await client.execute(`
            UPDATE interview_mapping
            SET interviewer_confirmed = TRUE,
                status = CASE WHEN candidate_confirmed = TRUE THEN 'confirmed' ELSE status END
            WHERE id = ?
        `, [mappingId]);

        // Session is already booked, no need to update it again

        await client.execute(`
            UPDATE application
            SET status = 'interview_scheduled'
            WHERE id = (SELECT application_id FROM interview_mapping WHERE id = ?)
            AND EXISTS (SELECT 1 FROM interview_mapping WHERE id = ? AND candidate_confirmed = TRUE AND interviewer_confirmed = TRUE)
        `, [mappingId, mappingId]);

        await client.commit();
        res.json({
            message: "Interview session confirmed by interviewer.",
            session: {
                sessionId: sessionId,
                start: session.session_start,
                end: session.session_end,
                status: "booked"
            }
        });
    } catch (error) {
        await client.rollback();
        console.error("Interviewer session confirmation error:", error.message);
        res.status(409).json({ error: error.message });
    } finally {
        client.release();
    }
});

/*router.post('/timeslots', (req, res) => {
    const interviewerId = req.params.id;
    let timeSlot = req.body;
    timeSlot.interviewer_id = interviewerId;
    timeSlots.push(timeSlot);
    res.status(201).send("Created availaibility time slot");
});*/

router.get('/:id/timeslots', (req, res) => {
    const interviewerId = req.params.id;
    const timeSlots = timeSlots.filter(element => element.interviewer_id === interviewerId);
    res.json(timeSlots);
});

module.exports = router;