import React, { useMemo, useState, useEffect } from 'react';
import { DayData, Reminder, Todo, Language, EventCategory, CalendarView } from '../types';
import { ChevronLeft, ChevronRight, CheckSquare, ChevronDown, Eye, EyeOff, LayoutGrid, Rows, Calendar as CalendarIcon, Clock, X, ArrowRight } from 'lucide-react';
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
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onEventDrop: (eventId: string, newDate: string) => void;
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
  onToggleFocusMode,
  view,
  onViewChange,
  onEventDrop
}) => {
  const t = TRANSLATIONS[language];
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Quick Preview Popover State
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const monthYearString = useMemo(() => {
    return currentDate.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' });
  }, [currentDate, language]);

  // --- Helper Functions ---
  
  const matchesFilter = (r: Reminder) => {
      if (categoryFilter === 'all') return true;
      return (r.category || 'work') === categoryFilter; 
  };
  
  const isPast = (d: Date) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return d < today;
  };

  const getDayEvents = (dateStr: string) => {
      const staticRem = (reminders[dateStr] || []).filter(matchesFilter);
      const recurring = recurringReminders
        .filter(r => isOccurrence(r, dateStr))
        .filter(matchesFilter);
      return [...staticRem, ...recurring].sort((a, b) => a.time.localeCompare(b.time));
  };

  // --- Data Generation ---

  const calendarDays = useMemo(() => {
    const days: DayData[] = [];
    
    if (view === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay(); 
        const daysInMonth = lastDayOfMonth.getDate();

        // Prev month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
          const d = new Date(year, month - 1, prevMonthLastDay - i);
          days.push({
            date: d,
            isCurrentMonth: false,
            isToday: false,
            dateString: d.toISOString().split('T')[0],
          });
        }
        // Current month
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          days.push({
            date: d,
            isCurrentMonth: true,
            isToday: ds === todayStr,
            dateString: ds,
          });
        }
        // Next month padding
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
          const d = new Date(year, month + 1, i);
          days.push({
             date: d,
             isCurrentMonth: false,
             isToday: false,
             dateString: d.toISOString().split('T')[0],
          });
        }
    } else if (view === 'week') {
        // Find start of week (Sunday) for currentDate
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            days.push({
                date: d,
                isCurrentMonth: d.getMonth() === currentDate.getMonth(),
                isToday: ds === todayStr,
                dateString: ds
            });
        }
    } else if (view === 'agenda') {
        // Generate list for the current month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        for (let i = 1; i <= daysInMonth; i++) {
           const d = new Date(year, month, i);
           const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
           days.push({
              date: d,
              isCurrentMonth: true,
              isToday: ds === todayStr,
              dateString: ds
           });
        }
    }

    return days;
  }, [currentDate, view]);

  // --- Handlers ---

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onSetDate(newDate);
    setIsMonthPickerOpen(false);
  };

  const handleDragStart = (e: React.DragEvent, reminderId: string) => {
      e.dataTransfer.setData('reminderId', reminderId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateString: string) => {
      e.preventDefault();
      const reminderId = e.dataTransfer.getData('reminderId');
      if (reminderId) {
          onEventDrop(reminderId, dateString);
      }
  };

  const handleDateClick = (dateString: string) => {
      // On desktop, show popover. On mobile, select immediately (or just select always and show popover if desktop)
      // For simplicity, we toggle preview if not already selected, or just select
      if (window.innerWidth >= 768) {
          setPreviewDate(dateString);
      } else {
          onSelectDate(dateString);
      }
  };

  // --- Renderers ---

  const renderCell = (day: DayData, idx: number) => {
      const isDayPast = isPast(day.date);
      const shouldDim = focusMode && isDayPast && !day.isToday;
      const allReminders = getDayEvents(day.dateString);
      const dayTodos = todos[day.dateString] || [];
      const isSelected = selectedDateStr === day.dateString;
      
      return (
        <div
          key={`${day.dateString}-${idx}`}
          onClick={() => handleDateClick(day.dateString)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, day.dateString)}
          className={`
            relative bg-white dark:bg-gray-900 p-1 md:p-1.5 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/80
            flex flex-col
            ${!day.isCurrentMonth ? 'bg-gray-50/30 dark:bg-gray-950 text-gray-300 dark:text-gray-700' : 'text-gray-800 dark:text-gray-200'}
            ${isSelected ? 'ring-2 ring-inset ring-primary-500 z-10' : ''}
            ${shouldDim ? 'opacity-30 grayscale hover:opacity-100 hover:grayscale-0' : ''}
            ${view === 'week' ? 'min-h-[300px]' : ''}
            ${view === 'month' ? 'min-h-[80px] md:min-h-0' : ''}
          `}
        >
          <div className="flex justify-between items-start shrink-0 mb-1">
            <span className={`
              text-lg md:text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all
              ${day.isToday 
                ? 'bg-primary-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-2 ring-primary-100 dark:ring-primary-900' 
                : ''}
            `}>
              {day.date.getDate()}
            </span>
            {view === 'week' && (
                <span className="text-xs font-medium text-gray-400 uppercase">{t.weekdays[day.date.getDay()]}</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
            {allReminders.map(rem => (
              <div 
                key={rem.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, rem.id)}
                className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded-[3px] truncate border-l-2 font-medium flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                  rem.isCompleted ? 'opacity-50 line-through' : ''
                } ${
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
  };

  const renderAgendaView = () => (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 space-y-4">
          {calendarDays.map((day) => {
              const events = getDayEvents(day.dateString);
              if (events.length === 0) return null;
              
              return (
                  <div key={day.dateString} className="flex gap-4">
                      <div className="w-16 shrink-0 text-center pt-2">
                          <div className={`text-xl font-bold ${day.isToday ? 'text-primary-600' : 'text-gray-900 dark:text-gray-100'}`}>{day.date.getDate()}</div>
                          <div className="text-xs text-gray-500 uppercase">{t.weekdays[day.date.getDay()]}</div>
                      </div>
                      <div className="flex-1 space-y-2 pb-4 border-b border-gray-100 dark:border-gray-800">
                          {events.map(rem => (
                              <div key={rem.id} onClick={() => onSelectDate(day.dateString)} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all">
                                  <div className={`w-1 h-8 rounded-full ${rem.color === 'red' ? 'bg-red-500' : rem.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                  <div className="flex-1">
                                      <h4 className={`font-medium ${rem.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{rem.title}</h4>
                                      <div className="text-xs text-gray-500">{rem.time} • {t[`cat_${rem.category || 'work'}`]}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )
          })}
          {calendarDays.every(d => getDayEvents(d.dateString).length === 0) && (
              <div className="text-center py-20 text-gray-400">{t.noEventsToday}</div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full min-h-[400px] md:min-h-0 bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-300 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20 shrink-0">
        <div className="flex items-center gap-4">
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
            <div className="hidden md:flex items-center justify-center px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700">
               <span className="text-xl font-mono font-medium text-gray-600 dark:text-gray-300 tracking-widest">
                  {currentTime.toLocaleTimeString([], { hour12: false })}
               </span>
            </div>
        </div>

        <div className="flex items-center space-x-1">
           {/* View Switcher */}
           <div className="hidden md:flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-2">
               <button onClick={() => onViewChange('month')} className={`p-1.5 rounded-md transition-all ${view === 'month' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500'}`} title={t.viewMonth}><LayoutGrid size={16} /></button>
               <button onClick={() => onViewChange('week')} className={`p-1.5 rounded-md transition-all ${view === 'week' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500'}`} title={t.viewWeek}><CalendarIcon size={16} /></button>
               <button onClick={() => onViewChange('agenda')} className={`p-1.5 rounded-md transition-all ${view === 'agenda' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500'}`} title={t.viewAgenda}><Rows size={16} /></button>
           </div>

          <button 
             onClick={onToggleFocusMode}
             className={`p-1.5 rounded-lg transition-colors ${focusMode ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
             title={focusMode ? t.focusModeOff : t.focusModeOn}
          >
             {focusMode ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button onClick={onPrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"><ChevronLeft size={20} /></button>
          <button onClick={onNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"><ChevronRight size={20} /></button>
        </div>

        {/* Month Picker Dropdown */}
        {isMonthPickerOpen && (
          <div className="absolute top-14 left-4 mt-1 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
             {/* ... existing picker code ... */}
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <button onClick={() => setPickerYear(y => y-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><ChevronLeft size={16} /></button>
                <span className="font-bold text-gray-800 dark:text-white">{pickerYear}</span>
                <button onClick={() => setPickerYear(y => y+1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><ChevronRight size={16} /></button>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {t.months.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => handleMonthSelect(idx)}
                    className={`py-2 text-xs font-medium rounded-lg transition-colors ${currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear ? 'bg-primary-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {m}
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Weekdays Header (Only for Month/Week views) */}
      {view !== 'agenda' && (
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 shrink-0">
            {t.weekdays.map(day => (
              <div key={day} className="py-2 text-center text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
      )}

      {/* Main Grid Content */}
      {view === 'agenda' ? renderAgendaView() : (
          <div className={`grid grid-cols-7 ${view === 'month' ? 'grid-rows-6' : 'grid-rows-1'} flex-1 bg-gray-100 dark:bg-gray-800 gap-px border-b border-gray-200 dark:border-gray-800`}>
            {calendarDays.map((day, idx) => renderCell(day, idx))}
          </div>
      )}

      {/* Quick Preview Popover */}
      {previewDate && (
          <>
            <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setPreviewDate(null)} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-40 p-4 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {new Date(previewDate).toLocaleDateString(language==='zh'?'zh-CN':'en-US', {month:'short', day:'numeric', weekday: 'short'})}
                    </h3>
                    <button onClick={() => setPreviewDate(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                <div className="space-y-2 mb-4">
                    {getDayEvents(previewDate).slice(0, 3).map(rem => (
                        <div key={rem.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                             <div className={`w-1.5 h-1.5 rounded-full ${rem.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                             <span className="flex-1 truncate">{rem.title}</span>
                             <span className="text-xs text-gray-400">{rem.time}</span>
                        </div>
                    ))}
                    {getDayEvents(previewDate).length === 0 && <p className="text-sm text-gray-400 italic">{t.noEventsToday}</p>}
                    {getDayEvents(previewDate).length > 3 && <p className="text-xs text-gray-400">+{getDayEvents(previewDate).length - 3} {t.more}</p>}
                </div>
                <button 
                   onClick={() => { onSelectDate(previewDate); setPreviewDate(null); }}
                   className="w-full py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                    {t.viewDetails} <ArrowRight size={14} />
                </button>
            </div>
          </>
      )}
    </div>
  );
};

export default CalendarGrid;