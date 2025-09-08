import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import staffRoutes from "./routes/staffRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import leetcodeRoutes from "./routes/leetcodeRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Connect Database
connectDB();

// Routes
app.use("/staffs", staffRoutes);
app.use("/students", studentRoutes);
app.use("/api", leetcodeRoutes);
app.use("/report", reportRoutes);

// PORT (Render uses process.env.PORT)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
