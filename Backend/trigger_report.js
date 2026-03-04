import fetch from "node-fetch";

/**
 * Utility script to manually trigger the monthly report generation process.
 * Usage: node trigger_report.js [dayOverride] [weekNumber]
 */
async function trigger() {
    const args = process.argv.filter(arg => !arg.startsWith("--"));
    const dayOverride = args[2] ? parseInt(args[2]) : null;
    const weekNumber = args[3] ? parseInt(args[3]) : null;

    const isProduction = process.argv.includes("--prod");
    const baseUrl = isProduction
        ? "https://leetcode-status-tracker.onrender.com"
        : "http://localhost:5000";

    console.log(`🚀 Triggering Monthly Report Process...`);
    console.log(`   - Environment: ${isProduction ? "Production" : "Local"}`);
    if (dayOverride) console.log(`   - Day Override: ${dayOverride}`);
    if (weekNumber) console.log(`   - Week Number: ${weekNumber}`);

    try {
        const response = await fetch(`${baseUrl}/api/admin/trigger-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayOverride, weekNumber })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("\n✅ Success:", data.message || data);
        } else {
            console.error("\n❌ Server Error:", data.message || data);
        }
    } catch (error) {
        console.error("\n❌ Error triggering report:", error.message);
        if (!isProduction) console.log("Ensure the backend server is running on port 5000.");
    }
}

trigger();
