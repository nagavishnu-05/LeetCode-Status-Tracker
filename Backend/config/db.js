import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const MONGO_URI =
      'mongodb+srv://nagavishnukarthikbs_db_user:uoopDMuDdLX7inXV@leetcode.g1wwaxx.mongodb.net/VCET?retryWrites=true&w=majority';
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }
};

export default connectDB;
