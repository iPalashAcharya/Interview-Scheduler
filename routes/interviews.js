const express = require('express');
const router = express.Router();
const { applications } = require('./applications');
const { interviewers, interviewers } = require('./interviewers');

let interviewMappings = [{
    id: 1,
    interviewer_id: 1,
    candidate_id: 1,
    slot_id: 1,
    interview_dateTime: 'random datetime',
    status: 'scheduled',
}]

function getMatchingInterviewers(candidateId) {
    const candidate = applications.find(candidate => candidate.id === candidateId);
    const domain_id = candidate.applied_domain_id;
    const interviewers = interviewers.filter(interviewer => interviewer.domain_expertise_id === domain_id);
    return interviewers;
}


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