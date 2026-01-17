import fetch from "node-fetch";

/**
 * Utility script to manually trigger the monthly report generation process.
 * Usage: node trigger_report.js [dayOverride] [weekNumber]
 */
async function trigger() {
    const dayOverride = process.argv[2] ? parseInt(process.argv[2]) : null;
    const weekNumber = process.argv[3] ? parseInt(process.argv[3]) : null;

    console.log(`🚀 Triggering Monthly Report Process...`);
    if (dayOverride) console.log(`   - Day Override: ${dayOverride}`);
    if (weekNumber) console.log(`   - Week Number: ${weekNumber}`);

    try {
        const response = await fetch("http://localhost:5000/api/admin/trigger-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayOverride, weekNumber })
        });

        const data = await response.json();
        console.log("\n✅ Response from Server:", data);
    } catch (error) {
        console.error("\n❌ Error triggering report:", error.message);
        console.log("Ensure the backend server is running on port 5000.");
    }
}

trigger();
