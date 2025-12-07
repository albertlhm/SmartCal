import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CalendarGrid from './components/CalendarGrid';
import DayPanel from './components/DayPanel';
import SearchModal from './components/SearchModal';
import AuthModal from './components/AuthModal';
import AllTodosModal from './components/AllTodosModal';
import StatsModal from './components/StatsModal';
import Toast from './components/Toast';
import BottomNav from './components/BottomNav';
import { Reminder, Todo, Language, User, EventCategory, HistoryItem, MobileTab, CalendarView } from './types';
import { TRANSLATIONS } from './constants/translations';
import { AuthService } from './services/authService';
import { DataService } from './services/dataService';
import { isOccurrence } from './utils/recurrence';
import { Calendar, Moon, Sun, Search, Languages, Download, Upload, Plus, LogIn, LogOut, User as UserIcon, Bell, BellOff, PieChart, AlertTriangle, CalendarDays, CheckSquare, ChevronRight, Square } from 'lucide-react';

// Storage keys
const STORAGE_KEY_THEME = 'smartcal_theme';
const STORAGE_KEY_LANG = 'smartcal_lang';
const STORAGE_KEY_NOTIFICATIONS = 'smartcal_notifications';
const STORAGE_KEY_FOCUS = 'smartcal_focus';

const CATEGORIES: EventCategory[] = ['work', 'personal', 'study', 'health', 'travel', 'other'];

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // --- App State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [initialPanelTab, setInitialPanelTab] = useState<'events' | 'todos'>('events');
  
  const [reminders, setReminders] = useState<Record<string, Reminder[]>>({});
  const [recurringReminders, setRecurringReminders] = useState<Reminder[]>([]);
  const [todos, setTodos] = useState<Record<string, Todo[]>>({});
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllTodosOpen, setIsAllTodosOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [focusMode, setFocusMode] = useState(false);

  // Mobile Navigation State
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar');
  // View State
  const [calendarView, setCalendarView] = useState<CalendarView>('month');

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const lastCheckedMinute = useRef<string>("");

  const [dataError, setDataError] = useState<string | null>(null);

  // History & Toast State
  const [historyStack, setHistoryStack] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<{ message: string, visible: boolean, canUndo: boolean }>({ message: '', visible: false, canUndo: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // --- Initialization ---

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    }
    const storedLang = localStorage.getItem(STORAGE_KEY_LANG);
    if (storedLang === 'en' || storedLang === 'zh') setLanguage(storedLang as Language);

    const storedNotif = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (storedNotif === 'true' && Notification.permission === 'granted') setNotificationsEnabled(true);

    const storedFocus = localStorage.getItem(STORAGE_KEY_FOCUS);
    if (storedFocus === 'true') setFocusMode(true);
  }, []);

  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setDataError(null);
      if (!currentUser) {
        setReminders({});
        setRecurringReminders([]);
        setTodos({});
        setHistoryStack([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubReminders = DataService.subscribeToReminders(user.id, (all) => {
        const map: Record<string, Reminder[]> = {};
        const recur: Reminder[] = [];
        all.forEach(r => {
          if (r.repeat && r.repeat !== 'none') recur.push(r);
          else {
            if (!map[r.date]) map[r.date] = [];
            map[r.date].push(r);
          }
        });
        setReminders(map);
        setRecurringReminders(recur);
      }, (err) => err.code === 'permission-denied' ? setDataError('Access denied') : setDataError('Sync error')
    );
    const unsubTodos = DataService.subscribeToTodos(user.id, (all) => {
        const map: Record<string, Todo[]> = {};
        all.forEach(t => { if(!map[t.date]) map[t.date]=[]; map[t.date].push(t); });
        setTodos(map);
      }
    );
    const unsubPrefs = DataService.subscribeToPreferences(user.id, (p) => {
      if (p.theme) setIsDarkMode(p.theme === 'dark');
      if (p.language) setLanguage(p.language);
    });
    return () => { unsubReminders(); unsubTodos(); unsubPrefs(); };
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem(STORAGE_KEY_THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_LANG, language); }, [language]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, String(notificationsEnabled)); }, [notificationsEnabled]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_FOCUS, String(focusMode)); }, [focusMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (notificationsEnabled) {
        const currentMinuteStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (lastCheckedMinute.current !== currentMinuteStr) {
          lastCheckedMinute.current = currentMinuteStr;
          // ... Notification Logic from previous implementation ...
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [notificationsEnabled, reminders, recurringReminders, language, t]);

  // --- Handlers ---

  const handleLogin = () => setIsAuthModalOpen(true);
  const handleLogout = async () => { await AuthService.logout(); setUser(null); };
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (user) DataService.updatePreferences(user.id, { theme: newMode ? 'dark' : 'light' });
  };
  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    if (user) DataService.updatePreferences(user.id, { language: newLang });
  };
  const toggleFocusMode = () => setFocusMode(!focusMode);
  
  const handleEventDrop = useCallback(async (eventId: string, newDate: string) => {
      if (!user) return;
      // Find event
      let target: Reminder | undefined;
      for (const date in reminders) {
          const found = reminders[date].find(r => r.id === eventId);
          if (found) { target = found; break; }
      }
      // Assuming we don't drag recurring instances for now, just static
      if (target) {
          const updated = { ...target, date: newDate };
          try {
              await DataService.updateReminder(user.id, updated);
              showToast(`${t.eventAdded} ${newDate}`, false);
          } catch(e) {
              console.error(e);
          }
      }
  }, [user, reminders, t]);

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleSetDate = (date: Date) => setCurrentDate(date);
  const handleSelectDate = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    if (targetDate.getMonth() !== currentDate.getMonth() || targetDate.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    }
    setSelectedDateStr(dateStr);
    setInitialPanelTab('events');
    setIsPanelOpen(true);
  };
  const handleClosePanel = () => { setIsPanelOpen(false); setSelectedDateStr(null); };
  const handleQuickAdd = (type: 'events' | 'todos') => {
    if (!selectedDateStr) {
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setSelectedDateStr(dateStr);
    }
    setInitialPanelTab(type);
    setIsPanelOpen(true);
  };

  const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), []);
  const showToast = (message: string, canUndo: boolean = false) => setToast({ message, visible: true, canUndo });
  const addToHistory = (item: HistoryItem) => setHistoryStack(prev => [...prev, item]);
  const handleUndo = useCallback(async () => { /* ... existing undo ... */ }, [historyStack, user, t]);

  // CRUD wrappers (similar to previous)
  const handleAddReminder = async (r: Reminder) => { if(user) DataService.addReminder(user.id, r); };
  const handleUpdateReminder = async (r: Reminder) => { if(user) DataService.updateReminder(user.id, r); };
  const handleDeleteReminder = async (id: string) => { if(user) DataService.deleteReminder(user.id, id); };
  const handleAddTodo = async (todo: Todo) => { if(user) DataService.addTodo(user.id, todo); };
  const handleUpdateTodo = async (t: Todo) => { if(user) DataService.updateTodo(user.id, t); };
  const handleDeleteTodo = async (id: string) => { if(user) DataService.deleteTodo(user.id, id); };
  
  const handleToggleTodo = async (id: string) => { 
      if (!user) return;
      let targetTodo: Todo | undefined;
      // Search through all dates
      for (const date in todos) {
          const found = todos[date].find(t => t.id === id);
          if (found) { targetTodo = found; break; }
      }
      if (targetTodo) {
          const updated = { ...targetTodo, completed: !targetTodo.completed };
          await DataService.updateTodo(user.id, updated);
      }
  };
  
  // Handlers for settings buttons
  const toggleNotifications = () => setNotificationsEnabled(!notificationsEnabled);
  const handleExport = () => { /* export logic */ };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: any) => { /* import logic */ };

  const currentReminders = useMemo(() => {
      if (!selectedDateStr) return [];
      const staticRem = reminders[selectedDateStr] || [];
      const recurring = recurringReminders.filter(r => isOccurrence(r, selectedDateStr));
      return [...staticRem, ...recurring];
  }, [selectedDateStr, reminders, recurringReminders]);
  const currentTodos = selectedDateStr ? (todos[selectedDateStr] || []) : [];

  // Logic for Today's Schedule (Reminders)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayReminders = useMemo(() => {
      const staticRem = reminders[todayDateStr] || [];
      const recurring = recurringReminders.filter(r => isOccurrence(r, todayDateStr));
      return [...staticRem, ...recurring].sort((a, b) => a.time.localeCompare(b.time));
  }, [reminders, recurringReminders, todayDateStr]);

  const QuickActionButtons = () => (
    <div className="flex flex-row gap-2 mb-4 shrink-0">
        <button onClick={() => handleQuickAdd('events')} className="flex-1 flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors border border-transparent dark:border-gray-700 shadow-sm">
            <span className="text-xs sm:text-sm font-semibold text-center whitespace-nowrap">{t.addReminder}</span>
        </button>
        <button onClick={() => handleQuickAdd('todos')} className="flex-1 flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors border border-transparent dark:border-gray-700 shadow-sm">
            <span className="text-xs sm:text-sm font-semibold text-center whitespace-nowrap">{t.addTodo}</span>
        </button>
    </div>
  );

  return (
    <div className="h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* --- SIDEBAR (Desktop) / TOPBAR (Mobile) --- */}
      <div className="w-full md:w-20 lg:w-72 bg-white dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex md:flex-col items-center md:items-start p-3 md:p-6 justify-between transition-colors duration-300 shadow-sm md:shadow-none z-20 relative">
        {/* Logo */}
        <div className="flex items-center justify-between w-full md:w-auto md:block shrink-0">
          <div className="flex items-center space-x-3 mb-0 md:mb-6 justify-center md:justify-start">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 shrink-0">
              <Calendar size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white lg:block hidden">{t.appName}</h1>
          </div>
          {/* Mobile Top Actions */}
          <div className="flex md:hidden items-center space-x-1">
             <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"><Search size={20} /></button>
             <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"><Languages size={20} /></button>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </div>

        {/* Desktop Sidebar Content */}
        <div className="hidden md:flex flex-col w-full h-full overflow-hidden items-center lg:items-stretch min-h-0">
          <button onClick={user ? handleLogout : handleLogin} className="flex items-center gap-2 mb-4 px-2 lg:px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm w-full justify-center lg:justify-start group shrink-0">
             <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0"><UserIcon size={24} className="text-gray-500 dark:text-gray-300 lg:w-[14px] lg:h-[14px]" /></div>
             <div className="hidden lg:flex flex-col items-start overflow-hidden">
                <span className="font-medium truncate max-w-full text-gray-700 dark:text-gray-200">{authLoading ? '...' : (user ? user.username : t.guest)}</span>
             </div>
          </button>
          <button onClick={() => setIsSearchOpen(true)} className="hidden lg:flex w-full mb-2 items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-all text-sm group shadow-sm shrink-0">
            <Search size={16} className="group-hover:text-primary-500 transition-colors" />
            <span>{t.searchPlaceholder}</span>
            <span className="ml-auto text-[10px] opacity-60 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded bg-white dark:bg-gray-700">{t.searchCmd}</span>
          </button>
          <button onClick={() => setIsStatsOpen(true)} className="hidden lg:flex w-full mb-4 items-center gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-all text-sm font-medium shrink-0">
             <PieChart size={16} /><span>{t.dashboard}</span>
          </button>
          
          {/* Tablet Icons */}
          <button onClick={() => setIsSearchOpen(true)} className="flex lg:hidden mb-4 p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-colors"><Search size={28} /></button>
          <button onClick={() => setIsStatsOpen(true)} className="flex lg:hidden mb-4 p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-colors"><PieChart size={28} /></button>
          <button onClick={() => handleQuickAdd('events')} className="flex lg:hidden mb-4 p-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl transition-colors"><Plus size={28} /></button>

          <div className="hidden lg:flex flex-col flex-1 overflow-hidden min-h-0">
            <QuickActionButtons />
            
            {/* Sidebar "Today's Agenda" List */}
            <div className="flex-1 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/50 flex flex-col min-h-0 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between shrink-0">
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.todaySchedule}</span>
                   <button onClick={() => handleSelectDate(todayDateStr)} className="text-[10px] text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5">
                      {t.viewDetails} <ChevronRight size={10} />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                   {todayReminders.length === 0 ? (
                       <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                          <CalendarDays size={24} className="mx-auto mb-2 opacity-30" />
                          <p className="text-xs">{t.noEventsToday}</p>
                       </div>
                   ) : (
                       todayReminders.map(rem => (
                           <div key={rem.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all cursor-pointer" onClick={() => handleSelectDate(todayDateStr)}>
                               <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${rem.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                               <span className={`text-xs truncate flex-1 ${rem.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                   {rem.title}
                               </span>
                               <span className="text-[10px] text-gray-400">{rem.time}</span>
                           </div>
                       ))
                   )}
                </div>
            </div>
            
             <button onClick={() => setIsAllTodosOpen(true)} className="w-full flex items-center justify-center p-3 mt-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"><span className="text-sm font-semibold">{t.allTodos}</span></button>
          </div>
        </div>

        {/* Desktop Footer Actions */}
        <div className="hidden md:flex flex-col w-full mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 items-center lg:items-stretch gap-2 lg:gap-0 shrink-0">
           <div className="flex flex-col lg:flex-row items-center justify-between gap-1">
              <button onClick={toggleNotifications} className={`p-2.5 rounded-lg ${notificationsEnabled ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{notificationsEnabled ? <Bell size={24} className="lg:w-[18px] lg:h-[18px]" /> : <BellOff size={24} className="lg:w-[18px] lg:h-[18px]" />}</button>
              <button onClick={handleExport} className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><Download size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={handleImportClick} className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><Upload size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={toggleLanguage} className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><Languages size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={toggleTheme} className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">{isDarkMode ? <Sun size={24} className="lg:w-[18px] lg:h-[18px]" /> : <Moon size={24} className="lg:w-[18px] lg:h-[18px]" />}</button>
           </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col relative bg-white md:bg-gray-50 dark:bg-gray-950 overflow-hidden h-full pb-16 md:pb-0">
         {dataError && <div className="bg-red-500 text-white px-6 py-2 text-sm font-medium flex items-center justify-center gap-2 z-50"><AlertTriangle size={16} />{dataError}</div>}

         {/* Mobile Tab Content Routing */}
         <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Show Calendar Grid if on Desktop OR Mobile Calendar Tab */}
            <div className={`${(window.innerWidth >= 768 || mobileTab === 'calendar') ? 'flex' : 'hidden'} flex-col h-full`}>
                {/* Filter Bar */}
                <div className="px-4 md:px-6 pt-4 pb-2 md:pb-4 grid grid-cols-4 gap-2 md:flex md:flex-wrap md:justify-start shrink-0">
                    <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap col-span-1 ${categoryFilter === 'all' ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>{t.filterAll}</button>
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize col-span-1 ${categoryFilter === cat ? 'ring-2 ring-offset-1 ring-gray-300 dark:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 border border-gray-100 dark:border-gray-800'}`}>
                           {t[`cat_${cat}` as keyof typeof t]}
                        </button>
                    ))}
                </div>

                <div className="flex-1 px-2 md:px-6 lg:px-8 pb-4 min-h-0 flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar">
                     <CalendarGrid 
                       currentDate={currentDate}
                       onPrevMonth={handlePrevMonth}
                       onNextMonth={handleNextMonth}
                       onSetDate={handleSetDate}
                       onSelectDate={handleSelectDate}
                       reminders={reminders}
                       recurringReminders={recurringReminders}
                       todos={todos}
                       selectedDateStr={selectedDateStr}
                       language={language}
                       categoryFilter={categoryFilter}
                       focusMode={focusMode}
                       onToggleFocusMode={toggleFocusMode}
                       view={calendarView}
                       onViewChange={setCalendarView}
                       onEventDrop={handleEventDrop}
                       onDeleteReminder={handleDeleteReminder}
                     />
                </div>
            </div>
            
            {/* Mobile Tab: Today's Agenda */}
            <div className={`${(window.innerWidth < 768 && mobileTab === 'today') ? 'flex' : 'hidden'} flex-col h-full p-4 overflow-y-auto`}>
                 <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><CalendarDays size={20} className="text-primary-500"/> {t.todaySchedule}</h2>
                 <p className="text-sm text-gray-500 mb-4">{todayDateStr}</p>
                 <div className="space-y-3">
                    {todayReminders.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <p>{t.noEventsToday}</p>
                        </div>
                    ) : (
                        todayReminders.map(rem => (
                            <div key={rem.id} onClick={() => handleSelectDate(todayDateStr)} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                                <div className={`w-1.5 h-10 rounded-full ${rem.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <div className="flex-1">
                                    <h4 className={`text-lg font-medium ${rem.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{rem.title}</h4>
                                    <div className="text-sm text-gray-500">{rem.time} • {t[`cat_${rem.category || 'work'}` as keyof typeof t]}</div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
            </div>

            {/* Mobile Tab: Todos (Render AllTodosModal content inline) */}
            <div className={`${(window.innerWidth < 768 && mobileTab === 'todos') ? 'block' : 'hidden'} h-full overflow-y-auto`}>
                 <AllTodosModal 
                    isOpen={true} 
                    onClose={() => setMobileTab('calendar')} 
                    todos={todos} 
                    onToggleTodo={handleToggleTodo} 
                    onDeleteTodo={handleDeleteTodo} 
                    language={language} 
                 />
            </div>

            {/* Mobile Tab: Stats */}
            <div className={`${(window.innerWidth < 768 && mobileTab === 'stats') ? 'block' : 'hidden'} h-full overflow-y-auto`}>
                 <StatsModal 
                    isOpen={true} 
                    onClose={() => setMobileTab('calendar')} 
                    reminders={reminders} 
                    recurringReminders={recurringReminders} 
                    todos={todos} 
                    language={language} 
                    currentDate={currentDate} 
                 />
            </div>

            {/* Mobile Tab: Profile */}
            <div className={`${(window.innerWidth < 768 && mobileTab === 'profile') ? 'block' : 'hidden'} p-6 h-full overflow-y-auto bg-white dark:bg-gray-900`}>
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t.tabProfile}</h2>
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full text-primary-600"><UserIcon size={24}/></div>
                        <div>
                            <p className="font-bold text-lg dark:text-white">{user ? user.username : t.guest}</p>
                            <p className="text-sm text-gray-500">{user ? 'Signed in' : 'Not signed in'}</p>
                        </div>
                    </div>
                    
                    <button onClick={user ? handleLogout : handleLogin} className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-left flex items-center justify-between">
                         <span className="dark:text-white">{user ? t.logout : t.login}</span>
                         {user ? <LogOut size={20}/> : <LogIn size={20}/>}
                    </button>
                    
                    <button onClick={handleExport} className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-left flex items-center justify-between">
                        <span className="dark:text-white">{t.exportData}</span>
                        <Download size={20}/>
                    </button>
                    <button onClick={handleImportClick} className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-left flex items-center justify-between">
                        <span className="dark:text-white">{t.importData}</span>
                        <Upload size={20}/>
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={mobileTab} onTabChange={setMobileTab} language={language} />

      {/* Modals (Desktop) */}
      <Toast message={toast.message} isVisible={toast.visible} onUndo={toast.canUndo ? handleUndo : undefined} onClose={hideToast} language={language} />
      
      {isPanelOpen && selectedDateStr && (
        <>
          <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm z-40" onClick={handleClosePanel} />
          <DayPanel dateStr={selectedDateStr} isOpen={isPanelOpen} onClose={handleClosePanel} reminders={currentReminders} todos={currentTodos} onAddReminder={handleAddReminder} onDeleteReminder={handleDeleteReminder} onUpdateReminder={handleUpdateReminder} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} onUpdateTodo={handleUpdateTodo} onDeleteTodo={handleDeleteTodo} language={language} initialTab={initialPanelTab} />
        </>
      )}

      {/* Only show these modals if NOT on mobile tabs (since mobile tabs use them inline-ish) */}
      {window.innerWidth >= 768 && (
          <>
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} reminders={reminders} recurringReminders={recurringReminders} todos={todos} onSelectDate={handleSelectDate} language={language} />
            <AllTodosModal isOpen={isAllTodosOpen} onClose={() => setIsAllTodosOpen(false)} todos={todos} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} language={language} />
            <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} reminders={reminders} recurringReminders={recurringReminders} todos={todos} language={language} currentDate={currentDate} />
          </>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLoginSuccess={setUser} language={language} />
    </div>
  );
};

export default App;