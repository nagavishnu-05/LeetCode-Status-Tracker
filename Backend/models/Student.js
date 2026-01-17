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
  className: { type: String, enum: ["A", "B", "C", "D"], required: true },
  batchYear: { type: Number, required: true },
  leetcodeLink: { type: String, default: null },
  statsHistory: { type: [statsSchema], default: [] },
}, { autoCreate: false, autoIndex: false });

// Dynamic model factory - creates models for batch-specific collections
export function getStudentModel(batchYear, db = mongoose) {
  const collectionName = `${batchYear}-${batchYear + 4}`;
  const modelName = `Student_${collectionName}`;

  // Check if model already exists on the provided connection to avoid OverwriteModelError
  if (db.models[modelName]) {
    return db.models[modelName];
  }

  return db.model(modelName, studentSchema, collectionName);
}

// Export schema for potential reuse
export { studentSchema };
