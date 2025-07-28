const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireAuth } = require('../config/passport');

router.post('/', requireAuth, async (req, res) => {
    const application = req.body;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [rows] = await client.query(`SELECT id FROM application WHERE candidate_id = ? AND job_id = ?`, [req.user.id, application.jobId]);

        if (rows.length > 0) {
            await client.rollback();
            return res.status(409).json({
                error: "You have already applied for this job opening."
            });
        }
        const [jobRow] = await client.query(`SELECT domain_id FROM job_opening WHERE id=?`, [application.jobId]);

        if (!jobRow) {
            await client.rollback();
            return res.status(404).json({ error: "Job opening not found." });
        }

        const appliedDomainId = jobRow.domain_id;

        const [result] = await client.execute(`INSERT INTO application(candidate_id,application_number,job_id,experience_years,applied_domain_id,stage_id,status) VALUES(?,?,?,?,?,?,?)`, [req.user.id, applicationNumber, application.jobId, application.experienceYears, appliedDomainId, 1, 'Submitted']);

        const insertId = result.insertId;
        const applicationNumber = String(insertId).padStart(4, 0);

        await client.execute(
            `UPDATE application SET application_number = ? WHERE id = ?`,
            [applicationNumber, insertId]
        );

        await client.commit();

        res.status(200).json({
            message: "Posted Application Successfully",
            applicationNumber
        });
    } catch (error) {
        await client.rollback();
        console.error("Candidate Application error:", error.message);
        res.status(409).json({ error: error.message });
    } finally {
        client.release();
    }
});

router.get('/', requireAdmin, async (req, res) => {
    const [applications] = await db.execute(`SELECT a.candidate_id,a.application_number,c.name,c.phone,c.email,c.current_country,c.address,experience_years,applied_at,c.skills,jop.title AS job_role, c.resume_url FROM application a LEFT JOIN candidate c ON a.candidate_id=c.id LEFT JOIN job_opening jop ON a.applied_domain_id=jop.id WHERE a.status IN ('submitted','under_review')`);
    res.json(applications);
});

router.post('/approve', requireAdmin, async (req, res) => {
    const candidateId = parseInt(req.body.id);
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(`UPDATE application SET status='shortlisted' WHERE candidate_id=?`, [candidateId]);

        await conn.commit();

        res.status(200).json({
            message: "Shortlisted applicant successfully"
        });

    } catch (error) {
        await conn.rollback();
        console.error("Candidate slot choice error:", error.message);
        res.status(409).json({ error: error.message });
    } finally {
        conn.release();
    }
});

module.exports = router;