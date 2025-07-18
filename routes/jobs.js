const express = require("express");
const router = express.Router();

let jobs = [
    {
        job_id: 1,
        title: 'Random',
        domain_id: 'random',
        required_exp: 0,
        min_cgpa: 0,
        status: 'open',
        created_at: 'Random Timestamp',
    }
]

router.get('/', (req, res) => { //get all the job openings
    res.json(jobs);
});

router.post('/', (req, res) => { //post a new job opening
    const job = req.body;
    jobs.push(job);
});

module.exports = router;