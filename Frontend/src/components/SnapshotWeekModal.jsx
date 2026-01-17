import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Calendar, X, Info } from "lucide-react";

export default function SnapshotWeekModal({ isOpen, onClose, onSelect }) {
    const weeks = [1, 2, 3, 4, 5];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <Motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-xl">
                                <Calendar size={20} className="text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Select Week</h2>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Choose week to store snapshot</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100/50">
                            <Info size={14} className="text-blue-600" />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                Choose a week to archive performance data in the monthly database.
                            </p>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            {weeks.map((week) => (
                                <Motion.button
                                    key={week}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onSelect(week)}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-all text-center group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-black text-gray-700 shadow-sm group-hover:text-purple-600 transition-colors">
                                        {week}
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="block text-xs font-black text-gray-900 uppercase">Week {week}</span>
                                        <span className="block text-[9px] text-gray-400 font-bold">
                                            {week === 1 ? "4th" : week === 2 ? "11th" : week === 3 ? "18th" : week === 4 ? "25th" : "2nd"}
                                        </span>
                                    </div>
                                </Motion.button>
                            ))}
                        </div>
                    </div>
                    <div className="px-8 py-4 bg-gray-50 text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Administrative Action Require Verification</p>
                    </div>
                </Motion.div>
            </div>
        </AnimatePresence>
    );
}
