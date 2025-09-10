import mongoose from "mongoose";

const statsSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  registerNo: { type: String, required: true },
  name: { type: String, required: true },
  className: { type: String, enum: ["A", "B", "C"], required: true },
  batchYear: { type: Number, required: true },
  leetcodeLink: { type: String, default: null },
  statsHistory: { type: [statsSchema], default: [] },
});

export default mongoose.model("Student", studentSchema, "students");
