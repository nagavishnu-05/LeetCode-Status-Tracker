import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  registerNo: { type: String, required: true },
  name: { type: String, required: true },
  className: { type: String, enum: ['A', 'B', 'C'], required: true },
  batchYear: { type: Number, required: true },
  leetcodeLink: { type: String, default: null }
});

export default mongoose.model('Student', studentSchema, 'students'); // exact collection name
