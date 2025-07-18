const express = require('express');
const router = express.Router();
const { applications } = require('./applications');
const { timeSlots } = require('./interviewers');

function searchArrayOfObjects(arrayOfObjects, searchObject) {
    return arrayOfObjects.filter(item => {
        for (const key in searchObject) {
            if (searchObject.hasOwnProperty(key)) {
                if (item[key] === undefined || item[key] !== searchObject[key]) {
                    return false;
                }
            }
        }
        return true;
    });
}

router.get('/', (req, res) => {
    const { status, jobId, domainId } = req.query;
    filters = {};
    if (status) filters.status = status;
    if (jobId) filters.jobId = jobId;
    if (domainId) filters.domainId = domainId;
    const candidates = searchArrayOfObjects(applications, filters);
    res.json(candidates);
});

router.get('/:id', (req, res) => {
    const candidateId = req.params.id;
    const candidate = applications.find(candidate => candidate.id === candidateId);
    res.json(candidate);
});

router.post('/:id/timeslots', (req, res) => {
    const interviewerId = req.params.id;
    let timeSlot = req.body;
    timeSlot.interviewer_id = interviewerId;
    timeSlots.push(timeSlot);
    res.status(201).send("Created availaibility time slot");
});

router.put('/:id/status', (req, res) => {
    const candidateId = req.params.id;
    const status = req.body.status;
    let candidate = candidates.find(candidate => candidate.id === candidateId);
    candidate.status = status;
    res.status(201).send(`Status Updated to ${status}`);
});

module.exports = router;