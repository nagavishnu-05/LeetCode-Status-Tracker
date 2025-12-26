import fetch from "node-fetch";

async function trigger() {
    console.log("Triggering Urgent Monthly Report (Week 4)...");
    try {
        const response = await fetch("http://localhost:5000/api/admin/trigger-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayOverride: 25 })
        });
        const data = await response.json();
        console.log("Response:", data);
    } catch (error) {
        console.error("Error triggering report:", error.message);
        console.log("Make sure the server is available.");
    }
}

trigger();
