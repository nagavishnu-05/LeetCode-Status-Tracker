import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB, { monthlyDB } from "./config/db.js";
import staffRoutes from "./routes/staffRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import leetcodeRoutes from "./routes/leetcodeRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import roundsRoutes from "./routes/roundsRoutes.js";
import monthlyReportRoutes, { generateMonthlyReport } from "./routes/monthlyReportRoutes.js";
import cron from "node-cron";
import Staff from "./models/Staff.js";

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://leet-code-status-tracker.vercel.app",
];

app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

connectDB();

app.use("/staffs", staffRoutes);
app.use("/students", studentRoutes);
app.use("/api", leetcodeRoutes);
app.use("/report", reportRoutes);
app.use("/rounds", roundsRoutes);

// Health check endpoint to prevent Render from spinning down
app.get("/health", (req, res) => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    istTime: istTime.toLocaleString(),
    cronActive: true,
    nextReportDays: [2, 4, 11, 18, 25]
  });
});

app.use("/monthly-report", monthlyReportRoutes);

// Helper function to run the report generation process
async function runReportProcess(dayOverride = null) {
  const today = new Date();
  const day = dayOverride || today.getDate();

  // Report Days: 4th, 11th, 18th, 25th, and 2nd of next month (for Week 5)
  let weekNumber = 0;
  if (day === 4) weekNumber = 1;
  else if (day === 11) weekNumber = 2;
  else if (day === 18) weekNumber = 3;
  else if (day === 25) weekNumber = 4;
  else if (day === 2) weekNumber = 5;

  if (weekNumber > 0) {
    console.log(`📅 Triggering Weekly Report (Week ${weekNumber})`);

    try {
      // Fetch all active batches
      const distinctBatches = await Staff.distinct("batchYear");
      const classes = ["A", "B", "C", "D"];

      // Fetch existing collections in Monthly DB to avoid creating new ones
      // Fetch existing collections in Monthly DB to avoid creating new ones
      // Removed unreliable listCollections check. We will try to generate for all batch/class combos.


      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      let reportMonthIndex = today.getMonth();
      let reportYear = today.getFullYear();

      if (weekNumber === 5) {
        // If we are running on the 2nd, we are reporting for the *previous* month.
        reportMonthIndex = reportMonthIndex - 1;
        if (reportMonthIndex < 0) {
          reportMonthIndex = 11;
          reportYear = reportYear - 1;
        }
      }

      const currentMonth = `${monthNames[reportMonthIndex]} ${reportYear}`;

      await Promise.all(distinctBatches.map(async (batch) => {
        // Process classes in parallel for each batch to speed up the process
        await Promise.all(classes.map(async (className) => {
          try {
            await generateMonthlyReport(batch, className, currentMonth, weekNumber);
            // console.log(`✅ Generated report for Batch ${batch} Class ${className}`);
          } catch (err) {
            console.error(`❌ Failed to generate for Batch ${batch} Class ${className}:`, err.message);
          }
        }));
      }));

    } catch (err) {
      console.error("❌ Error in report process:", err);
      throw err;
    }
  } else {
    console.log(`ℹ️ Day ${day} is not a scheduled report day (Scheduled: 4, 11, 18, 25, 2).`);
  }
}

// Temporary manual trigger for cron job (for debugging/recovery)
app.all("/api/admin/trigger-report", async (req, res) => {
  try {
    const dayOverride = req.query?.dayOverride || req.body?.dayOverride;
    await runReportProcess(dayOverride);
    res.json({ message: "Report generation process completed. Check server logs for details." });
  } catch (err) {
    res.status(500).json({ message: "Failed to run report process", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📅 Cron Job Status: ACTIVE`);
  console.log(`⏰ Schedule: Daily at 6:00 PM IST (18:00 Asia/Kolkata)`);
  console.log(`📊 Report Days: 4th, 11th, 18th, 25th, and 2nd of next month`);

  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  console.log(`🕐 Current IST Time: ${istTime.toLocaleString()}`);
  console.log(`📍 Current Day: ${istTime.getDate()}`);

  // Calculate next scheduled report
  const today = istTime.getDate();
  const reportDays = [2, 4, 11, 18, 25];
  const nextDay = reportDays.find(day => day > today) || reportDays[0];
  console.log(`📆 Next Scheduled Report: ${nextDay}${nextDay === 1 ? 'st' : nextDay === 2 ? 'nd' : nextDay === 3 ? 'rd' : 'th'} at 6:00 PM IST`);
  console.log(`${"=".repeat(60)}\n`);
});

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
