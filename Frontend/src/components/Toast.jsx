import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    const variants = {
        hidden: { opacity: 0, x: 50, scale: 0.95 },
        visible: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: 20, scale: 0.95 }
    };

    const bgColors = {
        error: 'bg-white border-l-4 border-red-500',
        success: 'bg-white border-l-4 border-green-500',
        info: 'bg-white border-l-4 border-blue-500'
    };

    const iconColors = {
        error: 'text-red-500',
        success: 'text-green-500',
        info: 'text-blue-500'
    };

    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    className={`fixed top-5 right-5 z-[70] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-gray-100 w-auto max-w-xs ${bgColors[type]}`}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={variants}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <div className={`${iconColors[type]}`}>
                        <Icon size={18} />
                    </div>

                    <div className="flex-1 mr-2">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
