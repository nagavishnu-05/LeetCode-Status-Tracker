import mongoose from "mongoose";
import { monthlyDB } from "../config/db.js";

const monthlyReportSchema = new mongoose.Schema({
    rollNo: { type: String, required: true },
    registerNo: { type: String, required: true },
    name: { type: String, required: true },
    leetcodeLink: { type: String, default: null },
    className: { type: String, required: true },
    batchYear: { type: Number, required: true },
    month: {
        type: String,
        required: true,
        default: () => {
            const date = new Date();
            return date.toLocaleString('default', { month: 'long' }) + " " + date.getFullYear();
        }
    },
    startTotal: { type: Number, default: 0 }, // Total solved at the start of the month
    reportDate: { type: Date, default: Date.now },
    weeklyPerformance: [
        {
            weekNumber: { type: Number, required: true }, // 1 to 5
            date: { type: Date, default: Date.now },
            solved: {
                easy: { type: Number, default: 0 },
                medium: { type: Number, default: 0 },
                hard: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
            performanceCategory: {
                type: String,
                enum: ["Consistent", "Average", "Low"],
                required: true,
            },
        },
    ],
    overallStatus: {
        type: String,
        enum: ["Consistent", "Average", "Low", null],
        default: null
    },
}, { autoCreate: false, autoIndex: false });

// Dynamic model factory for Monthly Reports
export function getMonthlyReportModel(batchYear) {
    const collectionName = `${batchYear}-${batchYear + 4}`;

    // Check if model already exists on the monthlyDB connection
    if (monthlyDB.models[collectionName]) {
        return monthlyDB.models[collectionName];
    }

    return monthlyDB.model(collectionName, monthlyReportSchema, collectionName);
}

export { monthlyReportSchema };
