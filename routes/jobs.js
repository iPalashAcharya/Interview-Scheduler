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

router.post('/', async (req, res) => {
    const job = req.body;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();
        if (!job.title || !job.domain || !job.location || !job.employmentType) {
            await client.rollback();
            return res.status(400).json({ error: 'Missing required job fields.' });
        }
        const [domainRows] = await client.query("SELECT id FROM domain WHERE name=?", [job.domain]);
        if (domainRows.length === 0) {
            await client.rollback();
            return res.status(400).json({ error: 'Invalid domain specified.' });
        }
        const domainId = domainRows.id;
        const [result] = await client.execute(`INSERT INTO job_opening(title,description,requirements,domain_id,required_exp_years,min_cgpa,location,employment_type,status,application_deadline,department,skills_required,remote_option,vacancies_count,qualifications,benefits) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [job.title, job.description, job.requirements, domainId, job.requiredExpYears, job.minCgpa, job.location, job.employmentType, 'open', job.applicationDeadline, job.department, job.skillsRequired, job.remoteOption, job.vacanciesCount, job.qualifications, job.benefits]);
        const jobId = result.insertId;
        await client.commit();
        res.status(200).json({
            message: "Posted Job Opening successfully",
            jobId
        });
    } catch (error) {
        console.error('Error creating job opening', error.message);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;