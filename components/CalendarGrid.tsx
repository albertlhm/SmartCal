import React, { useMemo, useState } from 'react';
import { DayData, Reminder, Todo, Language, EventCategory } from '../types';
import { ChevronLeft, ChevronRight, CheckSquare, ChevronDown, Repeat, Eye, EyeOff } from 'lucide-react';
import { TRANSLATIONS } from '../constants/translations';
import { isOccurrence } from '../utils/recurrence';

interface CalendarGridProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSetDate: (date: Date) => void;
  onSelectDate: (dateStr: string) => void;
  reminders: Record<string, Reminder[]>;
  recurringReminders: Reminder[];
  todos: Record<string, Todo[]>;
  selectedDateStr: string | null;
  language: Language;
  categoryFilter: EventCategory | 'all';
  focusMode: boolean;
  onToggleFocusMode: () => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onSetDate,
  onSelectDate,
  reminders,
  recurringReminders,
  todos,
  selectedDateStr,
  language,
  categoryFilter,
  focusMode,
  onToggleFocusMode
}) => {
  const t = TRANSLATIONS[language];
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const monthYearString = useMemo(() => {
    return currentDate.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' });
  }, [currentDate, language]);

  const calendarDays = useMemo(() => {
    const days: DayData[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dateString,
      });
    }

    // Current month
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        dateString,
      });
    }

    // Next month padding to fill 6 rows (42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dateString,
      });
    }

    return days;
  }, [currentDate]);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onSetDate(newDate);
    setIsMonthPickerOpen(false);
  };

  const handlePickerPrevYear = () => setPickerYear(y => y - 1);
  const handlePickerNextYear = () => setPickerYear(y => y + 1);

  // Helper to check filter
  const matchesFilter = (r: Reminder) => {
      if (categoryFilter === 'all') return true;
      return (r.category || 'work') === categoryFilter; 
  };
  
  // Helper to check if date is in past (for Focus Mode)
  const isPast = (d: Date) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return d < today;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-300 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20 shrink-0">
        <button 
          onClick={() => {
            setPickerYear(currentDate.getFullYear());
            setIsMonthPickerOpen(!isMonthPickerOpen);
          }}
          className="flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
           <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white tracking-tight">{monthYearString}</h2>
           <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center space-x-1">
          <button 
             onClick={onToggleFocusMode}
             className={`p-1.5 rounded-lg transition-colors ${focusMode ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
             title={focusMode ? t.focusModeOff : t.focusModeOn}
          >
             {focusMode ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button 
            onClick={onPrevMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={onNextMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Month Picker Dropdown */}
        {isMonthPickerOpen && (
          <div className="absolute top-14 left-4 mt-1 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <button onClick={handlePickerPrevYear} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300">
                   <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-gray-800 dark:text-white">{pickerYear}</span>
                <button onClick={handlePickerNextYear} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300">
                   <ChevronRight size={16} />
                </button>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {t.months.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => handleMonthSelect(idx)}
                    className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                      currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 shrink-0">
        {t.weekdays.map(day => (
          <div key={day} className="py-2 text-center text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid - Flex 1 to take remaining height, grid-rows-6 to distribute evenly */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-gray-100 dark:bg-gray-800 gap-px border-b border-gray-200 dark:border-gray-800">
        {calendarDays.map((day, idx) => {
          const isDayPast = isPast(day.date);
          const shouldDim = focusMode && isDayPast && !day.isToday;

          const dayReminders = (reminders[day.dateString] || []).filter(matchesFilter);
          
          // Find recurring reminders that match this day
          const dayRecurring = recurringReminders
            .filter(r => isOccurrence(r, day.dateString))
            .filter(matchesFilter);

          const allReminders = [...dayReminders, ...dayRecurring].sort((a, b) => a.time.localeCompare(b.time));
          const dayTodos = todos[day.dateString] || [];
          const isSelected = selectedDateStr === day.dateString;
          
          return (
            <div
              key={day.dateString}
              onClick={() => onSelectDate(day.dateString)}
              className={`
                relative bg-white dark:bg-gray-900 p-1 md:p-1.5 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/80
                flex flex-col
                ${!day.isCurrentMonth ? 'bg-gray-50/30 dark:bg-gray-950 text-gray-300 dark:text-gray-700' : 'text-gray-800 dark:text-gray-200'}
                ${isSelected ? 'ring-2 ring-inset ring-primary-500 z-10' : ''}
                ${shouldDim ? 'opacity-30 grayscale hover:opacity-100 hover:grayscale-0' : ''}
              `}
            >
              <div className="flex justify-between items-start shrink-0 mb-1">
                <span className={`
                  text-sm md:text-base font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all
                  ${day.isToday 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30' 
                    : ''}
                `}>
                  {day.date.getDate()}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                {allReminders.map(rem => (
                  <div 
                    key={rem.id} 
                    className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded-[3px] truncate border-l-2 font-medium flex items-center gap-1 ${
                      rem.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300' :
                      rem.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300' :
                      rem.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-300' :
                      rem.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300' :
                      rem.color === 'gray' ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-500 text-gray-700 dark:text-gray-300' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <span className="truncate">{rem.title}</span>
                  </div>
                ))}
                
                {categoryFilter === 'all' && dayTodos.length > 0 && (
                   <div className="pt-0.5 mt-0.5">
                     {dayTodos.slice(0, 1).map(todo => (
                        <div key={todo.id} className={`flex items-center gap-0.5 text-[9px] ${todo.completed ? 'opacity-40 line-through' : 'opacity-80'}`}>
                           <CheckSquare size={8} />
                           <span className="truncate">{todo.text}</span>
                        </div>
                     ))}
                     {dayTodos.length > 1 && (
                       <span className="text-[8px] text-gray-400 pl-2">+{dayTodos.length - 1}</span>
                     )}
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;