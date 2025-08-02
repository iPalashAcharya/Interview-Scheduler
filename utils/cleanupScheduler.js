const cron = require('node-cron');
const db = require('../db');

async function deleteExpiredSlots() {
    const client = await db.getConnection();
    try {
        await client.beginTransaction();
        // Soft-deleting mappings
        await client.execute(`
      UPDATE interview_mapping
      SET is_active = FALSE
      WHERE slot_id IN (SELECT id FROM time_slot WHERE slot_end < NOW())
    `);
        // Soft-deleting time_slots
        await client.execute(`
      UPDATE time_slot
      SET is_active = FALSE
      WHERE slot_end < NOW()
    `);
        await client.commit();
        console.log(`[${new Date().toISOString()}] Expired slots cleanup completed.`);
    } catch (error) {
        await client.rollback();
        console.error(`[${new Date().toISOString()}] Cleanup error:`, error);
    } finally {
        client.release();
    }
}

cron.schedule('0 * * * *', deleteExpiredSlots);
