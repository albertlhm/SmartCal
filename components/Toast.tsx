import React, { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { TRANSLATIONS } from '../constants/translations';
import { Language } from '../types';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onUndo?: () => void;
  onClose: () => void;
  language: Language;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onUndo, onClose, language }) => {
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-4 min-w-[300px] justify-between">
        <span className="text-sm font-medium">{message}</span>
        <div className="flex items-center gap-2">
          {onUndo && (
            <button 
              onClick={() => { onUndo(); onClose(); }}
              className="text-primary-400 dark:text-primary-600 hover:text-primary-300 dark:hover:text-primary-700 text-sm font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={14} />
              {t.undo}
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 dark:hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;