const express = require('express');
const router = express.Router();

let applications = [];

router.post('/', (req, res) => {
    const application = req.body;
    applications.push(application);
    res.status(201).send("Created application");
});

router.get('/', (req, res) => {
    res.json(applications);
});

router.put('/:id/shortlist', (req, res) => {
    const applicationId = req.params.id;
    let application = applications.find(application => application.id === applicationId);
    application.status = 'shortlisted';
    candidates.push(application);
    res.status(201).send("Shortlisted Application");
});

module.exports = { router, applications };