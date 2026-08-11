import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDanger = false,
  showInput = false,
  inputValue = "",
  onInputChange = () => {},
  inputPlaceholder = "Type here..."
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[400px] rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDanger ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white mb-2">{title}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>

          {showInput && (
            <div className="mt-4">
              <input
                type="text"
                autoFocus
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-100 outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm(inputValue);
              onClose();
            }}
            disabled={showInput && !inputValue.trim()}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
