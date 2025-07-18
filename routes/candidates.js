const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    const [candidates] = await db.query("SELECT * FROM candidate LEFT JOIN users ON users.id=candidate.id"); //square brackets to just get the actual data and not the metadata about the fields
    res.json(candidates);
});

router.get('/:id', async (req, res) => {
    const candidateId = req.params.id;
    const [candidate] = await db.query("SELECT * FROM candidate LEFT JOIN users ON users.id=candidate.id WHERE candidate.id=?", [candidateId]);
    res.json(candidate);
});

/*router.put('/:id/status', (req, res) => {
    const candidateId = req.params.id;
    const status = req.body.status;
    let candidate = candidates.find(candidate => candidate.id === candidateId);
    candidate.status = status;
    res.status(201).send(`Status Updated to ${status}`);
});*/

module.exports = router;