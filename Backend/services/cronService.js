import cron from "node-cron";
import { runReportProcess } from "./reportService.js";

/**
 * Initializes all cron jobs for the application.
 */
export function initCronJobs() {
    // Cron Job: Run every day at 6:00 PM IST
    cron.schedule("00 18 * * *", async () => {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        console.log(`\n${"=".repeat(60)}`);
        console.log(`⏱️  CRON JOB TRIGGERED`);
        console.log(`🕐 Trigger Time (IST): ${istTime.toLocaleString()}`);
        console.log(`📍 Day of Month: ${istTime.getDate()}`);
        console.log(`${"=".repeat(60)}\n`);

        try {
            await runReportProcess();
            console.log(`✅ Cron job execution completed successfully\n`);
        } catch (error) {
            console.error(`❌ Cron job execution failed:`, error);
        }
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log(`✅ Cron Job Status: ACTIVE (Schedule: 18:00 IST)`);
}
