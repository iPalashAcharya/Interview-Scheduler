const express = require("express");
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [result] = await db.query(`SELECT id,title,description,requirements,domain_id,required_exp_years,min_cgpa,location,employment_type,status,application_deadline,created_at,department,skills_required,remote_option,vacancies_count,qualifications,benefits FROM job_opening WHERE status='open'`);
        res.json(result);
    } catch (error) {
        console.error('Error fetching job openings:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', (req, res) => {
    const job = req.body;
    jobs.push(job);
});

module.exports = router;