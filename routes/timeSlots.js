const express = require('express');
const db = require('../db');
const { parseISO, isValid } = require('date-fns');
const router = express.Router();

function isValidDate(dateString) {
    const parsedDate = parseISO(dateString);  // Parses 'YYYY-MM-DD'
    return isValid(parsedDate);
}

router.get('/:id', requireAuth, async (req, res) => {
    const userId = req.params.id;
    if (String(userId) !== String(req.user.id) && req.user.role !== "Admin" && req.user.role !== "HR") {
        return res.status(401).json({ error: `You are not authorized to view timeslots of id ${userId}` });
    }
    const client = await db.getConnection();
    try {
        const [result] = await client.execute(`SELECT user_id,slot_start,slot_end,is_booked,slot_status FROM time_slot WHERE user_id = ?`, [userId]);
        if (result.length === 0) {
            res.json({
                message: `No time slots for the user id:${userId}`
            });
        }
        res.json(result);
    } catch (error) {
        console.error("Error fetching Time slots", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

router.get('/:id/:date', requireAuth, async (req, res) => {
    const userId = req.params.id;
    const date = req.params.date;
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Invalid date format or non-existent date.' });
    }
    if (String(userId) !== String(req.user.id) && req.user.role !== "Admin" && req.user.role !== "HR") {
        return res.status(401).json({ error: `You are not authorized to view timeslots on ${date} for id ${userId}` });
    }
    const client = await db.getConnection();
    try {
        const [timeslots] = await client.execute(
            `SELECT user_id, slot_start, slot_end, is_booked, slot_status 
             FROM time_slot 
             WHERE user_id = ? 
             AND DATE(slot_start) = ? 
             ORDER BY slot_start ASC`,
            [userId, date]
        );
        if (timeslots.length === 0) {
            return res.status(404).json({ message: `No time slots found for user id ${userId} on ${date}` });
        }
        res.json(timeslots);

    } catch (error) {
        console.error(`Error fetching Time slots on date ${date}`, error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

router.post('/', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { slotStart, slotEnd } = req.body;
    if (req.user.role === "Candidate") {
        res.status(401).json({ error: "You are not authorized to post time slots" });
    }
    if (!slotStart || !slotEnd) {
        return res.status(400).json({ error: "slot start and slot end are required." });
    }
    if (new Date(slotStart) >= new Date(slotEnd)) {
        return res.status(400).json({ error: "slot end must be after slot start." });
    }
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        await client.execute(`INSERT INTO time_slot(user_id,slot_start,slot_end,is_booked,slot_status) VALUES(?,?,?,false,'free')`, [userId, slotStart, slotEnd]);

        await client.commit();
        res.status(201).json({ message: "Timeslot created successfully." });
    } catch (error) {
        await client.rollback();
        console.error("Error creating timeslot:", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

module.exports = router;