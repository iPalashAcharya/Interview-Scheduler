const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../config/passport');

router.post('/', requireAdmin, async (req, res) => {
    const application = req.body;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [result] = await client.query(`SELECT COUNT(id) FROM application`);
        const applicationNumber = `APP`

        await client.execute(`INSERT INTO application(candidate_id,application_number,job_id,name,email,phone,experience_years,applied_domain_id,stage_id,current_location,status,skills) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, [application.candidate_id,]);
    } catch (error) {

    } finally {
        client.release();
    }
    res.status(201).send("Created application");
});

router.get('/', requireAdmin, async (req, res) => {
    const [applications] = await db.execute(`SELECT candidate_id,application_number,name,phone,email,current_location,experience_years,applied_at,skills,jop.title AS job_role, c.resume_url FROM application LEFT JOIN job_opening jop ON application.applied_domain_id=jop.id LEFT JOIN candidate c ON application.candidate_id=c.id WHERE application.status IN ('submitted','under_review')`);
    res.json(applications);
});

router.post('/approve', requireAdmin, async (req, res) => {
    const candidateId = parseInt(req.body.id);
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await db.execute(`UPDATE application SET status='shortlisted' WHERE candidate_id=?`, [candidateId]);

        await conn.commit();

        res.status(200).json({
            message: "Shortlisted applicant successfully"
        });

    } catch (error) {
        await conn.rollback();
        console.error("Candidate slot choice error:", err.message);
        res.status(409).json({ error: err.message });
    } finally {
        conn.release();
    }
});

module.exports = router;