import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, Github, Linkedin, Mail, User, Briefcase } from "lucide-react";

const teamMembers = [
    {
        name: "Nagavishnu Karthik B S",
        links: {
            github: "https://github.com/nagavishnu-05",
            linkedin: "https://www.linkedin.com/in/naga-vishnu-karthik-b-s/",
            mail: "mailto:nagavishnukarthikbs@gmail.com"
        }
    },
    {
        name: "Devis Aruna Devi D",
        links: {
            github: "https://github.com/devisarunadevid",
            linkedin: "https://www.linkedin.com/in/devis-aruna-devi-d",
            mail: "mailto:devisarunadevidd@gmail.com"
        }
    }
];

export default function AboutUsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
                <Motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative"
                >
                    {/* Header with Background Gradient */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-10 text-white relative">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-3xl font-black tracking-tight mb-1">Our Team</h2>
                        <p className="text-blue-100 font-medium opactiy-90">Building the future of LeetCode tracking</p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Mentor Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                                    <Briefcase size={20} />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Project Mentor & Coordinator</h3>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                                <h4 className="text-xl font-bold text-gray-900">Mr. G. Balamuralikrishnan</h4>
                                <p className="text-gray-600 font-medium">Assistant Professor, CSE</p>
                            </div>
                        </section>

                        {/* Team Members Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                                    <User size={20} />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Team Members</h3>
                            </div>
                            <div className="space-y-4">
                                {teamMembers.map((member, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-purple-200 transition-colors group">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{member.name}</h4>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a href={member.links.github} target="_blank" rel="noreferrer" className="p-2.5 bg-white rounded-xl shadow-sm text-gray-600 hover:text-black hover:shadow-md transition-all">
                                                <Github size={18} />
                                            </a>
                                            <a href={member.links.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-white rounded-xl shadow-sm text-gray-600 hover:text-blue-600 hover:shadow-md transition-all">
                                                <Linkedin size={18} />
                                            </a>
                                            <a href={member.links.mail} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-600 hover:text-red-500 hover:shadow-md transition-all">
                                                <Mail size={18} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2023 - 2027 CSE B, Leetcode Status Trackerr</p>
                    </div>
                </Motion.div>
            </div>
        </AnimatePresence>
    );
}
