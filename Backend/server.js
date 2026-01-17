import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import staffRoutes from "./routes/staffRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import leetcodeRoutes from "./routes/leetcodeRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import roundsRoutes from "./routes/roundsRoutes.js";
import monthlyReportRoutes from "./routes/monthlyReportRoutes.js";
import legacyMonthlyRoutes from "./routes/legacyMonthlyRoutes.js";
import { initCronJobs } from "./services/cronService.js";
import { runReportProcess } from "./services/reportService.js";

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

// Connect to Database
connectDB();

// Initialize Cron Jobs
initCronJobs();

// API Routes
app.use("/staffs", staffRoutes);
app.use("/students", studentRoutes);
app.use("/api", leetcodeRoutes);
app.use("/report", reportRoutes);
app.use("/rounds", roundsRoutes);
app.use("/monthly-report", monthlyReportRoutes);
app.use("/legacy-monthly", legacyMonthlyRoutes);

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

// Admin Manual Trigger Endpoint
app.all("/api/admin/trigger-report", async (req, res) => {
  try {
    const dayOverride = req.query?.dayOverride || req.body?.dayOverride;
    const weekNumber = req.query?.weekNumber || req.body?.weekNumber;

    console.log(`🔌 Manual trigger received (Day: ${dayOverride || 'Today'}, Week: ${weekNumber || 'Auto'})`);

    await runReportProcess(dayOverride, weekNumber);
    res.json({ message: "Report generation process completed. Check server logs for details." });
  } catch (err) {
    res.status(500).json({ message: "Failed to run report process", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Server running on port ${PORT}`);

  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  console.log(`🕐 Current IST Time: ${istTime.toLocaleString()}`);
  console.log(`📍 Current Day: ${istTime.getDate()}`);

  // Info for logs
  const today = istTime.getDate();
  const reportDays = [2, 4, 11, 18, 25];
  const nextDay = reportDays.find(day => day > today) || reportDays[0];
  console.log(`📆 Next Scheduled Report: ${nextDay}${nextDay === 1 ? 'st' : nextDay === 2 ? 'nd' : nextDay === 3 ? 'rd' : 'th'} at 6:00 PM IST`);
  console.log(`${"=".repeat(60)}\n`);
});
