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
        interviewer.name = `${interviewer.firstName.toLowerCase().charAt(0).toUpperCase() + interviewer.firstName.toLowerCase().slice(1)} ${interviewer.lastName.toLowerCase().charAt(0).toUpperCase() + interviewer.lastName.toLowerCase().slice(1)}`
        await client.execute(`INSERT INTO interviewer(name,phone) VALUES (?,?) WHERE id=?`, [interviewer.name, interviewer.phone, req.user.id])
        const [domainRow] = await client.execute(`SELECT id FROM domain WHERE name=?`, [interviewer.domainName.toLowerCase().charAt(0).toUpperCase() + interviewer.domainName.toLowerCase().slice(1)]);
        await client.execute(`INSERT INTO interviewer_domain(interviewer_id,domain_id,proficiency_level) VALUES(?,?,?)`, [req.user.id, domainRow.id, interviewer.domainProficiencyLevel.toLowerCase()]);

    } catch (error) {

    } finally {
        client.release();
    }
});

router.post('/:id/timeslots', (req, res) => {
    const interviewerId = req.params.id;
    let timeSlot = req.body;
    timeSlot.interviewer_id = interviewerId;
    timeSlots.push(timeSlot);
    res.status(201).send("Created availaibility time slot");
});

router.get('/:id/timeslots', (req, res) => {
    const interviewerId = req.params.id;
    const timeSlots = timeSlots.filter(element => element.interviewer_id === interviewerId);
    res.json(timeSlots);
});

module.exports = router;