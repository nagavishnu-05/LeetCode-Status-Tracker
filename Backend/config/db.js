import "dotenv/config";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: VCET Database`);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

export default connectDB;

export const monthlyDB = mongoose.createConnection(process.env.MONGO_URI, {
  dbName: "Monthly",
});

monthlyDB.on("connected", () => {
  console.log("✅ Connected to Monthly Database");
});

monthlyDB.on("error", (err) => {
  console.error("❌ Monthly Database Connection Error:", err.message);
});
