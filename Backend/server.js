import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import staffRoutes from './routes/staffRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import leetcodeRoutes from './routes/leetcodeRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI =
  'mongodb+srv://nagavishnukarthikbs_db_user:uoopDMuDdLX7inXV@leetcode.g1wwaxx.mongodb.net/VCET?retryWrites=true&w=majority&appName=LeetCodeVCET';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/staffs', staffRoutes);
app.use('/students', studentRoutes);
app.use('/report', reportRoutes);
app.use('/api', leetcodeRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
