import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CalendarGrid from './components/CalendarGrid';
import DayPanel from './components/DayPanel';
import SearchModal from './components/SearchModal';
import AuthModal from './components/AuthModal';
import AllTodosModal from './components/AllTodosModal';
import StatsModal from './components/StatsModal';
import Toast from './components/Toast';
import { Reminder, Todo, Language, User, EventCategory, HistoryItem } from './types';
import { TRANSLATIONS } from './constants/translations';
import { AuthService } from './services/authService';
import { DataService } from './services/dataService';
import { isOccurrence } from './utils/recurrence';
import { Calendar, Moon, Sun, Clock as ClockIcon, Search, Languages, Download, Upload, Plus, ListTodo, Trash2, LogIn, LogOut, User as UserIcon, CheckSquare, Bell, BellOff, PieChart, AlertTriangle } from 'lucide-react';

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
  // currentTime state kept for notification logic, but UI removed
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllTodosOpen, setIsAllTodosOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [focusMode, setFocusMode] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const lastCheckedMinute = useRef<string>("");

  const [dataError, setDataError] = useState<string | null>(null);

  // History & Toast State
  const [historyStack, setHistoryStack] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<{ message: string, visible: boolean, canUndo: boolean }>({ message: '', visible: false, canUndo: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // --- Initialization ---

  // 1. Settings (Theme, Lang, Notif, Focus) - Device Preference
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    }

    const storedLang = localStorage.getItem(STORAGE_KEY_LANG);
    if (storedLang === 'en' || storedLang === 'zh') {
      setLanguage(storedLang as Language);
    }

    const storedNotif = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (storedNotif === 'true') {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }

    const storedFocus = localStorage.getItem(STORAGE_KEY_FOCUS);
    if (storedFocus === 'true') {
        setFocusMode(true);
    }
  }, []);

  // 2. Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setDataError(null);
      
      // If user logs out, clear data
      if (!currentUser) {
        setReminders({});
        setRecurringReminders([]);
        setTodos({});
        setHistoryStack([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Data Subscriptions (Firestore)
  useEffect(() => {
    if (!user) return;

    // Subscribe to Reminders
    const unsubReminders = DataService.subscribeToReminders(
      user.id, 
      (allReminders) => {
        setDataError(null);
        const newRemindersMap: Record<string, Reminder[]> = {};
        const newRecurring: Reminder[] = [];

        allReminders.forEach(r => {
          if (r.repeat && r.repeat !== 'none') {
            newRecurring.push(r);
          } else {
            if (!newRemindersMap[r.date]) {
              newRemindersMap[r.date] = [];
            }
            newRemindersMap[r.date].push(r);
          }
        });

        setReminders(newRemindersMap);
        setRecurringReminders(newRecurring);
      },
      (error) => {
        if (error.code === 'permission-denied') {
          setDataError('Access denied. Please check Firestore Rules in Firebase Console.');
        } else {
          setDataError('Failed to sync reminders.');
        }
      }
    );

    // Subscribe to Todos
    const unsubTodos = DataService.subscribeToTodos(
      user.id, 
      (allTodos) => {
        setDataError(null);
        const newTodosMap: Record<string, Todo[]> = {};
        allTodos.forEach(todo => {
          if (!newTodosMap[todo.date]) {
            newTodosMap[todo.date] = [];
          }
          newTodosMap[todo.date].push(todo);
        });
        setTodos(newTodosMap);
      },
      (error) => {
        if (error.code === 'permission-denied') {
          setDataError('Access denied. Please check Firestore Rules in Firebase Console.');
        } else {
           if (!dataError) setDataError('Failed to sync todos.');
        }
      }
    );

    return () => {
      unsubReminders();
      unsubTodos();
    };
  }, [user]);

  // --- Persistence Listeners for Settings ---

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LANG, language);
  }, [language]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FOCUS, String(focusMode));
  }, [focusMode]);

  // --- Advanced Notification Logic ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now); // Used only for internal timer logic, not display

      if (notificationsEnabled) {
        // Construct current minute string (e.g., "2023-10-27 14:30") using local time
        const currentMinuteStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (lastCheckedMinute.current !== currentMinuteStr) {
          lastCheckedMinute.current = currentMinuteStr;
          
          const todayDateStr = currentMinuteStr.split(' ')[0];
          const todayTimeStr = currentMinuteStr.split(' ')[1];
          const nowTs = now.getTime();
          
          // Helper to check and trigger alert
          const checkAndNotify = (rem: Reminder, actualDateStr: string) => {
             // Calculate Event Time Timestamp
             const eventDateTime = new Date(`${actualDateStr}T${rem.time}:00`);
             const eventTs = eventDateTime.getTime();

             // Check alerts (minutes before)
             const alertOffsets = rem.alerts && rem.alerts.length > 0 ? rem.alerts : [0]; // default to 0 (at time) if no alerts set
             
             // If no alerts array, we use the old exact time logic (0 offset)
             if (!rem.alerts || rem.alerts.length === 0) {
                 if (rem.time === todayTimeStr) {
                    sendNotification(rem.title, "Now");
                 }
                 return;
             }

             // Check custom alerts
             alertOffsets.forEach(offsetMinutes => {
                 // Calculate trigger time
                 const triggerTime = new Date(eventTs - offsetMinutes * 60000);
                 const triggerStr = `${triggerTime.getHours().toString().padStart(2, '0')}:${triggerTime.getMinutes().toString().padStart(2, '0')}`;
                 
                 // Check if NOW matches the trigger time (and date)
                 if (triggerTime.toDateString() === now.toDateString() && triggerStr === todayTimeStr) {
                     const timeMsg = offsetMinutes === 0 ? "Now" : `${offsetMinutes}m before`;
                     sendNotification(rem.title, timeMsg);
                 }
             });
          };

          const sendNotification = (title: string, bodySuffix: string) => {
             try {
                new Notification(t.notificationTitle, {
                  body: `${title} - ${bodySuffix}`,
                  icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c5.png',
                  requireInteraction: true // Keep notification visible until user clicks
                });
              } catch (e) {
                console.error("Notification failed", e);
              }
          };
          
          // 1. Check static reminders for today
          const todaysStatic = reminders[todayDateStr] || [];
          todaysStatic.forEach(rem => checkAndNotify(rem, todayDateStr));

          // 2. Check recurring reminders
          recurringReminders.forEach(rem => {
              if (isOccurrence(rem, todayDateStr)) {
                  checkAndNotify(rem, todayDateStr);
              }
          });
        }
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [notificationsEnabled, reminders, recurringReminders, language, t]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, historyStack]);


  // --- Event Handlers ---

  const handleLogin = () => setIsAuthModalOpen(true);
  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleLanguage = () => setLanguage(l => l === 'zh' ? 'en' : 'zh');
  const toggleFocusMode = () => setFocusMode(!focusMode);
  
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
        return;
      }
      
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
        new Notification(t.appName, { body: t.notificationsEnabled });
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setNotificationsEnabled(true);
          new Notification(t.appName, { body: t.notificationsEnabled });
        }
      } else {
        alert(t.permissionDenied);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

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

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedDateStr(null);
  };

  const handleQuickAdd = (type: 'events' | 'todos') => {
    if (!selectedDateStr) {
        const d = new Date();
        // Use local date for default selection
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setSelectedDateStr(dateStr);
    }
    setInitialPanelTab(type);
    setIsPanelOpen(true);
  };

  // useCallback ensures the function reference remains stable across renders (like clock ticks)
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showToast = (message: string, canUndo: boolean = false) => {
      setToast({ message, visible: true, canUndo });
  };

  const addToHistory = (item: HistoryItem) => {
      setHistoryStack(prev => [...prev, item]);
  };

  const handleUndo = useCallback(async () => {
      if (historyStack.length === 0 || !user) return;
      
      const lastAction = historyStack[historyStack.length - 1];
      const newStack = historyStack.slice(0, -1);
      setHistoryStack(newStack);

      try {
          switch (lastAction.type) {
              case 'ADD_REMINDER':
                  // Inverse: Delete
                  if (lastAction.inverseId) await DataService.deleteReminder(user.id, lastAction.inverseId);
                  break;
              case 'DELETE_REMINDER':
                  // Inverse: Add (Restore)
                  await DataService.addReminder(user.id, lastAction.data);
                  break;
              case 'UPDATE_REMINDER':
                  // Inverse: Update (Restore old data)
                  await DataService.updateReminder(user.id, lastAction.data);
                  break;
              case 'ADD_TODO':
                  if (lastAction.inverseId) await DataService.deleteTodo(user.id, lastAction.inverseId);
                  break;
              case 'DELETE_TODO':
                  await DataService.addTodo(user.id, lastAction.data);
                  break;
              case 'UPDATE_TODO':
                  await DataService.updateTodo(user.id, lastAction.data);
                  break;
          }
          showToast(t.actionUndone, false);
      } catch (e) {
          console.error("Undo failed", e);
          setDataError("Undo failed. Please try again.");
      }
  }, [historyStack, user, t]);

  // --- CRUD Operations (Calls to DataService) ---

  const handleAddReminder = useCallback(async (reminder: Reminder) => {
    if (!user) {
      alert(t.loginToSync);
      return;
    }
    try {
      await DataService.addReminder(user.id, reminder);
      addToHistory({ type: 'ADD_REMINDER', data: null, inverseId: reminder.id });
      showToast(t.eventAdded + ' ' + reminder.date, true);
    } catch (e) {
      console.error("Failed to add reminder", e);
      alert("Failed to save: Check network or permissions.");
    }
  }, [user, t]);

  const handleUpdateReminder = useCallback(async (updatedReminder: Reminder) => {
    if (!user) return;
    try {
      // Find old state for undo
      let oldState: Reminder | undefined;
      // Check static
      if (reminders[updatedReminder.date]) oldState = reminders[updatedReminder.date].find(r => r.id === updatedReminder.id);
      // Check recurring
      if (!oldState) oldState = recurringReminders.find(r => r.id === updatedReminder.id);

      await DataService.updateReminder(user.id, updatedReminder);
      
      if (oldState) {
          addToHistory({ type: 'UPDATE_REMINDER', data: oldState });
          showToast(t.updateReminder, true);
      }
    } catch (e) {
      console.error("Failed to update reminder", e);
    }
  }, [user, reminders, recurringReminders, t]);

  const handleDeleteReminder = useCallback(async (id: string, dateOverride?: string) => {
    if (!user) return;
    try {
      // Find item for undo
      let itemToDelete: Reminder | undefined;
      // Search in recurring first
      itemToDelete = recurringReminders.find(r => r.id === id);
      if (!itemToDelete) {
          // Search static maps
           for (const date in reminders) {
               const found = reminders[date].find(r => r.id === id);
               if (found) {
                   itemToDelete = found;
                   break;
               }
           }
      }

      await DataService.deleteReminder(user.id, id);
      
      if (itemToDelete) {
          addToHistory({ type: 'DELETE_REMINDER', data: itemToDelete });
          showToast(t.reminderDeleted, true);
      }
    } catch (e) {
      console.error("Failed to delete reminder", e);
    }
  }, [user, recurringReminders, reminders, t]);

  const handleAddTodo = useCallback(async (todo: Todo) => {
    if (!user) {
      alert(t.loginToSync);
      return;
    }
    try {
      await DataService.addTodo(user.id, todo);
      addToHistory({ type: 'ADD_TODO', data: null, inverseId: todo.id });
      showToast(t.addTodo, true);
    } catch (e) {
      console.error("Failed to add todo", e);
      alert("Failed to save: Check network or permissions.");
    }
  }, [user, t]);

  const handleUpdateTodo = useCallback(async (updatedTodo: Todo) => {
    if (!user) return;
    try {
      // Find old
      let old: Todo | undefined;
      if (todos[updatedTodo.date]) old = todos[updatedTodo.date].find(t => t.id === updatedTodo.id);

      await DataService.updateTodo(user.id, updatedTodo);

      if (old) {
          // addToHistory({ type: 'UPDATE_TODO', data: old }); 
      }
    } catch (e) {
      console.error("Failed to update todo", e);
    }
  }, [user, todos]);

  const handleToggleTodo = useCallback(async (id: string, dateOverride?: string) => {
    if (!user) return;
    let targetTodo: Todo | undefined;
    if (selectedDateStr) {
        targetTodo = todos[selectedDateStr]?.find(t => t.id === id);
    }
    if (!targetTodo) {
        for (const date in todos) {
            const found = todos[date].find(t => t.id === id);
            if (found) {
                targetTodo = found;
                break;
            }
        }
    }

    if (targetTodo) {
      try {
        await DataService.updateTodo(user.id, { ...targetTodo, completed: !targetTodo.completed });
      } catch (e) {
        console.error("Failed to toggle todo", e);
      }
    }
  }, [user, todos, selectedDateStr]);

  const handleDeleteTodo = useCallback(async (id: string) => {
    if (!user) return;
    try {
      let toDelete: Todo | undefined;
      for (const date in todos) {
           const found = todos[date].find(t => t.id === id);
           if (found) {
               toDelete = found;
               break;
           }
      }
      await DataService.deleteTodo(user.id, id);
      if (toDelete) {
          addToHistory({ type: 'DELETE_TODO', data: toDelete });
          showToast(t.todoDeleted, true);
      }
    } catch (e) {
      console.error("Failed to delete todo", e);
    }
  }, [user, todos, t]);

  // --- Import / Export ---

  const handleExport = () => {
    const data = {
      version: 2,
      reminders,
      recurringReminders,
      todos,
      exportDate: new Date().toISOString(),
      user: user?.username || 'guest'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartcal_${user?.username || 'guest'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (!user) {
      alert(t.loginToSync);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        const importedReminders: Reminder[] = [];
        const importedTodos: Todo[] = [];

        // Flatten reminders map to list
        if (json.reminders) {
          Object.values(json.reminders).forEach((list: any) => {
            if (Array.isArray(list)) importedReminders.push(...list);
          });
        }
        if (json.recurringReminders) {
           importedReminders.push(...json.recurringReminders);
        }
        
        // Flatten todos
        if (json.todos) {
           Object.values(json.todos).forEach((list: any) => {
            if (Array.isArray(list)) importedTodos.push(...list);
          });
        }

        // Import to Firestore
        await DataService.importData(user.id, importedReminders, importedTodos);
        alert(t.importSuccess);
        
      } catch (err) {
        console.error(err);
        alert(t.importFail);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // Get today's events for the sidebar/mobile view
  const todayEvents = useMemo(() => {
    // FIX: Use local time instead of UTC (toISOString) to match calendar logic
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const todaysStatic = reminders[todayStr] || [];
    const todaysRecurring = recurringReminders.filter(r => isOccurrence(r, todayStr));
    
    return {
      dateStr: todayStr,
      events: [...todaysStatic, ...todaysRecurring].sort((a, b) => a.time.localeCompare(b.time))
    };
  }, [reminders, recurringReminders]);

  const currentReminders = useMemo(() => {
      if (!selectedDateStr) return [];
      const staticRem = reminders[selectedDateStr] || [];
      const recurring = recurringReminders.filter(r => isOccurrence(r, selectedDateStr));
      return [...staticRem, ...recurring];
  }, [selectedDateStr, reminders, recurringReminders]);

  const currentTodos = selectedDateStr ? (todos[selectedDateStr] || []) : [];

  // --- Components ---

  const TodayAgendaWidget = () => (
    <div className="flex flex-col h-full overflow-hidden">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">{t.todaySchedule}</h3>
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
            {todayEvents.events.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-gray-600 italic px-1">{t.noEventsToday}</div>
            ) : (
                todayEvents.events.map(event => (
                    <div key={event.id} className="group flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
                        <div className={`w-1 h-8 rounded-full ${
                            event.category === 'health' ? 'bg-red-500' :
                            event.category === 'personal' ? 'bg-green-500' :
                            event.category === 'study' ? 'bg-purple-500' :
                            event.category === 'travel' ? 'bg-orange-500' :
                            event.category === 'other' ? 'bg-gray-500' :
                            'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{event.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{event.time}</span>
                                {event.repeat && event.repeat !== 'none' && (
                                    <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-[10px]">
                                        {t.repeatLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteReminder(event.id, todayEvents.dateStr); }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
    </div>
  );

  const QuickActionButtons = () => (
    <div className="flex flex-row gap-2 mb-4">
        <button 
          onClick={() => handleQuickAdd('events')}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors border border-transparent dark:border-gray-700 shadow-sm"
        >
            <Plus size={18} />
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{t.addReminder}</span>
        </button>
        <button 
          onClick={() => handleQuickAdd('todos')}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors border border-transparent dark:border-gray-700 shadow-sm"
        >
            <ListTodo size={18} />
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{t.addTodo}</span>
        </button>
        <button 
          onClick={() => setIsAllTodosOpen(true)}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors border border-transparent dark:border-gray-700 shadow-sm"
        >
            <CheckSquare size={18} />
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{t.allTodos}</span>
        </button>
    </div>
  );

  return (
    <div className="h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* --- SIDEBAR (Desktop) / TOPBAR (Mobile) --- */}
      <div className="w-full md:w-20 lg:w-72 bg-white dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex md:flex-col items-center md:items-start p-3 md:p-6 justify-between transition-colors duration-300 shadow-sm md:shadow-none z-20 relative">
        
        {/* Logo & Mobile Top Controls */}
        <div className="flex items-center justify-between w-full md:w-auto md:block">
          <div className="flex items-center space-x-3 mb-0 md:mb-6 justify-center md:justify-start">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 shrink-0">
              <Calendar size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white lg:block hidden">{t.appName}</h1>
          </div>

          <div className="flex md:hidden items-center space-x-1">
             <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
               <Search size={20} />
             </button>
             <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                <Languages size={20} />
             </button>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <button onClick={user ? handleLogout : handleLogin} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
               {user ? <LogOut size={20} /> : <LogIn size={20} />}
             </button>
          </div>
        </div>

        {/* Desktop Sidebar Content */}
        <div className="hidden md:flex flex-col w-full h-full overflow-hidden items-center lg:items-stretch">
          
          {/* Login/User Status */}
          <button 
            onClick={user ? handleLogout : handleLogin}
            className="flex items-center gap-2 mb-4 px-2 lg:px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm w-full justify-center lg:justify-start group"
          >
             <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0">
                <UserIcon size={24} className="text-gray-500 dark:text-gray-300 lg:w-[14px] lg:h-[14px]" />
             </div>
             <div className="hidden lg:flex flex-col items-start overflow-hidden">
                <span className="font-medium truncate max-w-full text-gray-700 dark:text-gray-200">
                    {authLoading ? '...' : (user ? user.username : t.guest)}
                </span>
                <span className="text-[10px] text-gray-400">{user ? t.logout : t.loginToSync}</span>
             </div>
             <div className="ml-auto text-gray-400 hidden lg:block">
                 {user ? <LogOut size={14} /> : <LogIn size={14} />}
             </div>
          </button>

          {/* Search Trigger */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hidden lg:flex w-full mb-2 items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-all text-sm group shadow-sm"
          >
            <Search size={16} className="group-hover:text-primary-500 transition-colors" />
            <span>{t.searchPlaceholder}</span>
            <span className="ml-auto text-[10px] opacity-60 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded bg-white dark:bg-gray-700">{t.searchCmd}</span>
          </button>

          {/* Dashboard Trigger */}
          <button 
             onClick={() => setIsStatsOpen(true)}
             className="hidden lg:flex w-full mb-4 items-center gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-all text-sm font-medium"
          >
             <PieChart size={16} />
             <span>{t.dashboard}</span>
          </button>

          {/* Tablet Only Buttons */}
           <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex lg:hidden mb-4 p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-colors"
          >
            <Search size={28} />
          </button>

          <button 
             onClick={() => setIsStatsOpen(true)}
             className="flex lg:hidden mb-4 p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-colors"
          >
             <PieChart size={28} />
          </button>

          <button 
             onClick={() => handleQuickAdd('events')}
             className="flex lg:hidden mb-4 p-4 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-xl transition-colors"
          >
             <Plus size={28} />
          </button>

          <button 
             onClick={() => setIsAllTodosOpen(true)}
             className="flex lg:hidden w-full mb-6 items-center justify-center gap-2 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
          >
             <ListTodo size={28} />
          </button>

          {/* Info Box & Live Clock - REMOVED AS REQUESTED */}
          <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
            <QuickActionButtons />
            <TodayAgendaWidget />
          </div>
        </div>

        {/* Desktop Footer Actions */}
        <div className="hidden md:flex flex-col w-full mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 items-center lg:items-stretch gap-2 lg:gap-0">
           <div className="flex flex-col lg:flex-row items-center justify-between gap-1">
              <button onClick={toggleNotifications} className={`p-2.5 lg:p-2.5 rounded-lg transition-colors ${notificationsEnabled ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`} title={notificationsEnabled ? t.disableNotifications : t.enableNotifications}>{notificationsEnabled ? <Bell size={24} className="lg:w-[18px] lg:h-[18px]" /> : <BellOff size={24} className="lg:w-[18px] lg:h-[18px]" />}</button>
              <button onClick={handleExport} className="p-2.5 lg:p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={t.exportData}><Download size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={handleImportClick} className="p-2.5 lg:p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={t.importData}><Upload size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={toggleLanguage} className="p-2.5 lg:p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={t.toggleLang}><Languages size={24} className="lg:w-[18px] lg:h-[18px]" /></button>
              <button onClick={toggleTheme} className="p-2.5 lg:p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={t.toggleTheme}>{isDarkMode ? <Sun size={24} className="lg:w-[18px] lg:h-[18px]" /> : <Moon size={24} className="lg:w-[18px] lg:h-[18px]" />}</button>
           </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col relative bg-white md:bg-gray-50 dark:bg-gray-950 overflow-hidden h-full">
         
         {/* Error Banner */}
         {dataError && (
             <div className="bg-red-500 text-white px-6 py-2 text-sm font-medium flex items-center justify-center gap-2 z-50 animate-in slide-in-from-top shrink-0">
                 <AlertTriangle size={16} />
                 {dataError}
             </div>
         )}

         {/* Filter Bar */}
         <div className="px-4 md:px-6 pt-4 pb-2 md:pb-4 grid grid-cols-4 gap-2 md:flex md:flex-wrap md:justify-start shrink-0">
             <button
               onClick={() => setCategoryFilter('all')}
               className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap col-span-1 ${categoryFilter === 'all' ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
             >
               {t.filterAll}
             </button>
             {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap capitalize col-span-1 ${
                    categoryFilter === cat 
                      ? 'ring-2 ring-offset-1 ring-gray-300 dark:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-800'
                  }`}
                >
                   <span className={`inline-block w-2 h-2 rounded-full md:mr-2 ${
                     cat === 'work' ? 'bg-blue-500' :
                     cat === 'personal' ? 'bg-green-500' :
                     cat === 'study' ? 'bg-purple-500' :
                     cat === 'health' ? 'bg-red-500' :
                     cat === 'travel' ? 'bg-orange-500' : 'bg-gray-500'
                   }`}></span>
                   <span className="hidden md:inline">{t[`cat_${cat}` as keyof typeof t]}</span>
                </button>
             ))}
         </div>

         {/* Calendar Grid Container - Scrollable on mobile */}
         <div className="flex-1 px-2 md:px-6 lg:px-8 pb-4 min-h-0 flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar">
             <div className="flex-1 min-h-[400px] md:min-h-0 flex flex-col">
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
                 />
             </div>
             
             {/* Mobile-Only Bottom Section (Today Agenda + Buttons) - Kept out of scroll flow to prevent double scrollbars if possible, or simple block below */}
             <div className="md:hidden mt-2 shrink-0 pb-16">
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">{t.quickActions}</h3>
                  <button onClick={() => setIsStatsOpen(true)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                     <PieChart size={16} />
                  </button>
                </div>
                <QuickActionButtons />
                
                {/* Simplified Agenda for Mobile Bottom */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-3 h-auto min-h-[160px] flex-1">
                   <TodayAgendaWidget />
                </div>
             </div>
         </div>
      </div>

      {/* --- MODALS & OVERLAYS --- */}

      <Toast 
         message={toast.message} 
         isVisible={toast.visible} 
         onUndo={toast.canUndo ? handleUndo : undefined}
         onClose={hideToast}
         language={language}
      />

      {isPanelOpen && selectedDateStr && (
        <>
          <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={handleClosePanel} />
          <DayPanel 
            dateStr={selectedDateStr}
            isOpen={isPanelOpen}
            onClose={handleClosePanel}
            reminders={currentReminders}
            todos={currentTodos}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            onUpdateReminder={handleUpdateReminder}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            language={language}
            initialTab={initialPanelTab}
          />
        </>
      )}

      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        reminders={reminders}
        recurringReminders={recurringReminders}
        todos={todos}
        onSelectDate={handleSelectDate}
        language={language}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={setUser}
        language={language}
      />

      <AllTodosModal
        isOpen={isAllTodosOpen}
        onClose={() => setIsAllTodosOpen(false)}
        todos={todos}
        onToggleTodo={handleToggleTodo}
        onDeleteTodo={handleDeleteTodo}
        language={language}
      />

      <StatsModal 
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        reminders={reminders}
        recurringReminders={recurringReminders}
        todos={todos}
        language={language}
        currentDate={currentDate}
      />
    </div>
  );
};

export default App;