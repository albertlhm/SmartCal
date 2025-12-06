import React, { useMemo } from 'react';
import { X, PieChart, CheckCircle2, CalendarDays, TrendingUp } from 'lucide-react';
import { Reminder, Todo, Language, EventCategory } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { isOccurrence } from '../utils/recurrence';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: Record<string, Reminder[]>;
  recurringReminders: Reminder[];
  todos: Record<string, Todo[]>;
  language: Language;
  currentDate: Date;
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  work: 'bg-blue-500',
  personal: 'bg-green-500',
  study: 'bg-purple-500',
  health: 'bg-red-500',
  travel: 'bg-orange-500',
  other: 'bg-gray-500',
};

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, reminders, recurringReminders, todos, language, currentDate }) => {
  const t = TRANSLATIONS[language];

  // Calculate stats
  const stats = useMemo(() => {
    // 1. Todo Completion
    let totalTodos = 0;
    let completedTodos = 0;
    Object.values(todos).forEach(list => {
      (list as Todo[]).forEach(todo => {
        totalTodos++;
        if (todo.completed) completedTodos++;
      });
    });
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    // 2. Events this month
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    let monthEventsCount = 0;
    const categoryCounts: Record<string, number> = {
       work: 0, personal: 0, study: 0, health: 0, travel: 0, other: 0
    };

    // Check static
    Object.entries(reminders).forEach(([date, list]) => {
      if (date.startsWith(currentMonthStr)) {
        const remindersList = list as Reminder[];
        monthEventsCount += remindersList.length;
        remindersList.forEach(r => {
           const cat = r.category || 'other';
           categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      }
    });

    // Check recurring (approximation for visualization)
    recurringReminders.forEach(r => {
       // Just count them as 1 entity for distribution, 
       // or we could calculate occurrences. Let's count base entity for distribution to keep simple.
       const cat = r.category || 'other';
       categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const totalCategorized = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

    return {
      totalTodos,
      completedTodos,
      completionRate,
      monthEventsCount,
      categoryCounts,
      totalCategorized
    };
  }, [reminders, recurringReminders, todos, currentDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="text-primary-500" />
            {t.statsTitle}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/20">
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                   <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                      <CalendarDays size={24} />
                   </div>
                   <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t.totalEvents}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.monthEventsCount}</p>
                   </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                   <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                      <CheckCircle2 size={24} />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.completionRate}</p>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                         <div 
                           className="bg-green-500 h-2 rounded-full transition-all duration-1000" 
                           style={{ width: `${stats.completionRate}%` }} 
                         />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{stats.completedTodos} / {stats.totalTodos} tasks</p>
                   </div>
                </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-gray-400" />
                    {t.categoryDist}
                </h3>
                
                {stats.totalCategorized === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No data available</div>
                ) : (
                    <div className="space-y-4">
                        {(Object.keys(stats.categoryCounts) as EventCategory[]).map(cat => {
                             const count = stats.categoryCounts[cat];
                             const percentage = stats.totalCategorized > 0 ? (count / stats.totalCategorized) * 100 : 0;
                             if (percentage === 0) return null;

                             return (
                                <div key={cat}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]}`}></span>
                                            {t[`cat_${cat}`]}
                                        </span>
                                        <span className="text-gray-500">{Math.round(percentage)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div 
                                            className={`${CATEGORY_COLORS[cat]} h-2 rounded-full transition-all duration-1000`} 
                                            style={{ width: `${percentage}%` }} 
                                        />
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default StatsModal;