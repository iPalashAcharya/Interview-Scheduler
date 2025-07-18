const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const API_URL = 'http://localhost:3000'

let interviewMappings = [{
    id: 1,
    interviewer_id: 1,
    candidate_id: 1,
    slot_id: 1,
    interview_dateTime: 'random datetime',
    status: 'scheduled',
}]

router.get('/schedule/:id', async (req, res) => {
    const candidateId = parseInt(req.params.id);
    try {
        const [candidateRows] = await db.query("SELECT candidate_id, d.name, rt.round_type FROM application LEFT JOIN interview_round rt ON application.stage_id=rt.id LEFT JOIN domain d ON application.applied_domain_id=d.id WHERE application.candidate_id=?;", [candidateId]);
        if (candidateRows.length === 0) {
            return res.status(404).json({ error: "Candidate Not Found" });
        }
        const candidate = candidateRows[0];
        const candidateDomain = candidate.name;
        const [appropriate_interviewers] = await db.query("SELECT id.interviewer_id, i.name FROM interviewer_domain id LEFT JOIN domain d ON id.domain_id = d.id LEFT JOIN interviewer i ON id.interviewer_id = i.id WHERE d.name = ?;", [candidateDomain]);
        res.json(appropriate_interviewers);
    }
    catch (error) {
        console.log(error);
    }
});

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