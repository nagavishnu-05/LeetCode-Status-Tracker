import cron from "node-cron";
import { runReportProcess, sendAllMonthlyReports, cleanupMonthlyDatabase } from "./reportService.js";

/**
 * Initializes all cron jobs for the application.
 */
export function initCronJobs() {
    // Cron Job 1: Run every day at 6:00 PM IST (Standard Report)
    cron.schedule("00 18 * * *", async () => {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        console.log(`\n${"=".repeat(60)}`);
        console.log(`⏱️  CRON JOB TRIGGERED: Weekly/Daily Stats Collection`);
        console.log(`🕐 Trigger Time (IST): ${istTime.toLocaleString()}`);
        console.log(`📍 Day of Month: ${istTime.getDate()}`);
        console.log(`${"=".repeat(60)}\n`);

        try {
            await runReportProcess();
            console.log(`✅ Weekly/Daily stats collection completed successfully\n`);
        } catch (error) {
            console.error(`❌ Weekly/Daily stats collection failed:`, error);
        }
    }, {
        timezone: "Asia/Kolkata"
    });

    // Cron Job 2: Run on 2nd of every month at 6:10 PM IST (Monthly Summary Email)
    cron.schedule("10 18 2 * *", async () => {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        console.log(`\n${"=".repeat(60)}`);
        console.log(`📧  CRON JOB TRIGGERED: Monthly Summary Email Delivery`);
        console.log(`🕐 Trigger Time (IST): ${istTime.toLocaleString()}`);
        console.log(`${"=".repeat(60)}\n`);

        try {
            await sendAllMonthlyReports();
            console.log(`✅ Monthly summary email process completed successfully\n`);
        } catch (error) {
            console.error(`❌ Monthly summary email process failed:`, error);
        }
    }, {
        timezone: "Asia/Kolkata"
    });

    // Cron Job 3: Run on 3rd of every month at 10:00 AM IST (Database Refresh/Cleanup)
    cron.schedule("00 10 3 * *", async () => {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        console.log(`\n${"=".repeat(60)}`);
        console.log(`🧹  CRON JOB TRIGGERED: Monthly Database Refresh`);
        console.log(`🕐 Trigger Time (IST): ${istTime.toLocaleString()}`);
        console.log(`${"=".repeat(60)}\n`);

        try {
            await cleanupMonthlyDatabase();
            console.log(`✅ Monthly database refresh completed successfully\n`);
        } catch (error) {
            console.error(`❌ Monthly database refresh failed:`, error);
        }
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log(`✅ Cron Job Status: ACTIVE (18:00 DAILY | 18:10 MONTHLY ON DAY 2 | 10:00 CLEANUP ON DAY 3)`);
}
