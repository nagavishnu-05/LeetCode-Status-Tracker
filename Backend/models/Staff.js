import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  className: { type: String, enum: ['A', 'B', 'C'], required: true },
  batchYear: { type: Number, required: true }
});

export default mongoose.model('Staff', staffSchema, 'staffs');
