const express = require('express');
const router = express.Router();

let interviewers = [
    {
        id: 1,
        email: 'random@example.com',
        name: 'random',
        phone: 2222222222,
        domain_expertise_id: 1,
    }
]

let timeSlots = [
    {
        id: 1,
        interviewer_id: 1,
        slot_datetime: 'Random Datetime',
        is_booked: false,
    }
]

router.get('/', (req, res) => {
    res.json(interviewers);
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

module.exports = { router, timeSlots, interviewers };