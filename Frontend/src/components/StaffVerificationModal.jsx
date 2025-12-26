import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import { ShieldCheck, Users, X, Eye, EyeOff } from "lucide-react";

export default function StaffVerificationModal({
    isOpen,
    onClose,
    onVerify,
    error,
    setError
}) {
    const [selectedVerifier, setSelectedVerifier] = useState("");
    const [verifierPassword, setVerifierPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onVerify(selectedVerifier, verifierPassword);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <ShieldCheck size={24} className="text-blue-600" />
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900">Staff Verification</h2>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setSelectedVerifier("");
                            setVerifierPassword("");
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="relative group">
                        <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                            <Users size={16} className="mr-2 text-blue-500" />
                            Staff Name
                        </label>
                        <select
                            className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                            value={selectedVerifier}
                            onChange={(e) => setSelectedVerifier(e.target.value)}
                            required
                        >
                            <option value="">Select Staff</option>
                            <option value="Mr. G. Vinoth Chakkaravarthy">Mr. G. Vinoth Chakkaravarthy</option>
                            <option value="Mr. G. BalamuraliKrishnan">Mr. G. BalamuraliKrishnan</option>
                            <option value="Mrs. A. Benazir Begum">Mrs. A. Benazir Begum</option>
                            <option value="Mrs. R. Pavithra">Mrs. R. Pavithra</option>
                        </select>
                        <div className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                            <ShieldCheck size={16} className="mr-2 text-purple-500" />
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all pr-12"
                                value={verifierPassword}
                                onChange={(e) => setVerifierPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <Motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-red-500 text-sm font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl"
                        >
                            <X size={16} />
                            {error}
                        </Motion.p>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-2xl bg-gray-900 text-white py-4 font-bold shadow-xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95"
                    >
                        Verify and Continue
                    </button>
                </form>
            </Motion.div>
        </div>
    );
}
