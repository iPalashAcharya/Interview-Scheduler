const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../config/passport');
const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
    const [interviewers] = await db.query("SELECT i.id,i.name,i.phone,r.id AS interviewer_round_type_id,r.name AS interviewer_round_type_name,id.domain_id AS interviewer_domain_id,id.proficiency_level,d.name AS interviewer_domain_name FROM interviewer i LEFT JOIN interviewer_round ir ON i.id=ir.interviewer_id LEFT JOIN interview_round r ON ir.round_type_id=r.id LEFT JOIN interviewer_domain id ON i.id=id.interviewer_id LEFT JOIN domain d ON id.domain_id=d.id");
    res.json(interviewers);
});

router.post('/', requireAdmin, (req, res) => {
    const interviewer = req.body;
    interviewers.push(interviewer);
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