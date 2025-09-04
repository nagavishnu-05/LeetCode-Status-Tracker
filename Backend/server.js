import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import staffRoutes from './routes/staffRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import leetcodeRoutes from './routes/leetcodeRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Routes
app.use('/staffs', staffRoutes);
app.use('/students', studentRoutes);
app.use('/api', leetcodeRoutes);
app.use('/report', reportRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
