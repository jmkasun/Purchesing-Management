import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'error' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'error'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-2xl p-8 max-w-md w-full"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                type === 'error' ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
              )}>
                {type === 'error' ? <Trash2 size={24} /> : <X size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface">{title}</h3>
                <p className="text-sm text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-on-surface-variant mb-8">
              {message}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-surface-container-low text-on-surface rounded-2xl font-bold hover:bg-surface-container-high transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg",
                  type === 'error' 
                    ? "bg-error text-on-error hover:bg-error/90 shadow-error/20" 
                    : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Helper to use cn if needed, or just use template literals
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
