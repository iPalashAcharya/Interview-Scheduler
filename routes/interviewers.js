const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../config/passport');
const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
    const [interviewer] = await db.query("SELECT ")
});

router.post('/', (req, res) => {
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