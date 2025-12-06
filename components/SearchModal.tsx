import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Calendar, Clock, ArrowRight, CheckSquare, Repeat } from 'lucide-react';
import { Reminder, Todo, Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: Record<string, Reminder[]>;
  recurringReminders: Reminder[];
  todos: Record<string, Todo[]>;
  onSelectDate: (dateStr: string) => void;
  language: Language;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, reminders, recurringReminders, todos, onSelectDate, language }) => {
  const [query, setQuery] = useState('');
  const t = TRANSLATIONS[language];

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const term = query.toLowerCase();
    const allItems: Array<{ type: 'reminder' | 'recurring' | 'todo', data: Reminder | Todo, date: string, sortKey: string }> = [];
    
    // Reminders
    Object.entries(reminders).forEach(([date, dayReminders]) => {
      (dayReminders as Reminder[]).forEach(r => {
        if (r.title.toLowerCase().includes(term) || (r.description && r.description.toLowerCase().includes(term))) {
            allItems.push({ type: 'reminder', data: r, date, sortKey: r.time });
        }
      });
    });

    // Recurring Reminders
    recurringReminders.forEach(r => {
      if (r.title.toLowerCase().includes(term) || (r.description && r.description.toLowerCase().includes(term))) {
          // For recurring, we show the start date or generic text
          allItems.push({ type: 'recurring', data: r, date: r.date, sortKey: r.time });
      }
    });

    // Todos
    Object.entries(todos).forEach(([date, dayTodos]) => {
        (dayTodos as Todo[]).forEach(todo => {
            if (todo.text.toLowerCase().includes(term)) {
                allItems.push({ type: 'todo', data: todo, date, sortKey: '00:00' });
            }
        });
    });

    // Sort by date
    return allItems.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.sortKey.localeCompare(b.sortKey);
    });
  }, [query, reminders, recurringReminders, todos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 sm:px-0">
        {/* Backdrop */}
        <div 
            className="fixed inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={onClose} 
        />
        
        {/* Modal Window */}
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            {/* Header / Input */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white dark:bg-gray-900">
                <Search className="text-gray-400 dark:text-gray-500" size={20} />
                <input 
                    type="text" 
                    placeholder={t.searchModalTitle} 
                    className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button 
                    onClick={onClose} 
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-2 bg-gray-50/50 dark:bg-black/20 flex-1">
                {results.length === 0 && query && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">{t.noResults} "{query}"</p>
                    </div>
                )}
                {results.length === 0 && !query && (
                    <div className="text-center py-10 opacity-50">
                        <Search size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t.startSearch}</p>
                    </div>
                )}
                
                <div className="space-y-1">
                    {results.map((item, idx) => {
                        const isReminder = item.type === 'reminder' || item.type === 'recurring';
                        const reminder = item.data as Reminder;
                        const todo = item.data as Todo;

                        return (
                            <button
                                key={`${item.date}-${idx}`}
                                onClick={() => {
                                    onSelectDate(item.date);
                                    onClose();
                                }}
                                className="w-full text-left p-3 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm rounded-xl transition-all flex items-start gap-3 group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                                {/* Indicator */}
                                {isReminder ? (
                                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 
                                        ${reminder.color === 'red' ? 'bg-red-500' : 
                                          reminder.color === 'green' ? 'bg-green-500' : 
                                          reminder.color === 'purple' ? 'bg-purple-500' : 
                                          'bg-blue-500'}`} 
                                    />
                                ) : (
                                    <CheckSquare size={16} className={`mt-0.5 shrink-0 ${todo.completed ? 'text-primary-500' : 'text-gray-400'}`} />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-medium truncate flex items-center gap-2 ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {isReminder ? reminder.title : todo.text}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                            <Calendar size={12} className="opacity-70" />
                                            {item.date}
                                        </span>
                                        {isReminder && (
                                            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                <Clock size={12} className="opacity-70" />
                                                {reminder.time}
                                            </span>
                                        )}
                                        {item.type === 'recurring' && (
                                             <span className="flex items-center gap-1.5 text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded border border-primary-100 dark:border-primary-800/30">
                                                <Repeat size={10} />
                                                {reminder.repeat}
                                            </span>
                                        )}
                                        {item.type === 'todo' && (
                                             <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                Todo
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                    <ArrowRight size={16} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 p-2 text-center border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                     <kbd className="font-sans px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">Esc</kbd> {t.close}
                </span>
            </div>
        </div>
    </div>
  );
};

export default SearchModal;