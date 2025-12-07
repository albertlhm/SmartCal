import React, { useState, useEffect } from 'react';
import { Reminder, Todo, Language, RepeatFrequency, EventCategory } from '../types';
import { X, Clock, Trash2, Plus, Sparkles, Loader2, ListTodo, Calendar as CalendarIcon, CheckSquare, Square, Pencil, Save, XCircle, Repeat, Tag, GripVertical } from 'lucide-react';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { TRANSLATIONS } from '../constants/translations';

interface DayPanelProps {
  dateStr: string;
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  todos: Todo[];
  onAddReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateReminder: (reminder: Reminder) => void;
  onAddTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onReorderTodo?: (draggedId: string, targetId: string) => void;
  language: Language;
  initialTab?: 'events' | 'todos';
}

const CATEGORIES: { value: EventCategory; color: string; bg: string }[] = [
  { value: 'work', color: 'blue', bg: 'bg-blue-500' },
  { value: 'personal', color: 'green', bg: 'bg-green-500' },
  { value: 'study', color: 'purple', bg: 'bg-purple-500' },
  { value: 'health', color: 'red', bg: 'bg-red-500' },
  { value: 'travel', color: 'orange', bg: 'bg-orange-500' },
  { value: 'other', color: 'gray', bg: 'bg-gray-500' },
];

const DayPanel: React.FC<DayPanelProps> = ({
  dateStr,
  isOpen,
  onClose,
  reminders,
  todos,
  onAddReminder,
  onDeleteReminder,
  onUpdateReminder,
  onAddTodo,
  onToggleTodo,
  onUpdateTodo,
  onDeleteTodo,
  onReorderTodo,
  language,
  initialTab = 'events',
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'events' | 'todos'>(initialTab);
  const [addMode, setAddMode] = useState<'manual' | 'ai'>('manual');
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Drag and Drop State for Todos
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);

  // Manual Event Form State
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [formDate, setFormDate] = useState(dateStr);
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<EventCategory>('work');
  const [repeat, setRepeat] = useState<RepeatFrequency>('none');
  
  // Todo Form State
  const [todoText, setTodoText] = useState('');

  // AI Form State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiError, setAiError] = useState('');

  // Reset form when date changes or panel opens
  useEffect(() => {
    if (isOpen) {
      resetForms();
      setFormDate(dateStr);
      setActiveTab(initialTab);
    }
  }, [isOpen, dateStr, initialTab]);

  const resetForms = () => {
      setTitle('');
      setDesc('');
      setTime('09:00');
      setFormDate(dateStr);
      setCategory('work');
      setRepeat('none');
      setAiPrompt('');
      setTodoText('');
      setAiError('');
      setIsProcessing(false);
      setEditingId(null);
  };

  const handleEditReminder = (rem: Reminder) => {
    setTitle(rem.title);
    setDesc(rem.description || '');
    setTime(rem.time);
    setFormDate(rem.date);
    setCategory(rem.category || 'work');
    setRepeat(rem.repeat || 'none');
    setEditingId(rem.id);
    setAddMode('manual');
    setActiveTab('events');
  };

  const handleEditTodo = (todo: Todo) => {
      setTodoText(todo.text);
      setEditingId(todo.id);
      setActiveTab('todos');
  };

  const getCategoryColor = (cat: EventCategory) => {
      const found = CATEGORIES.find(c => c.value === cat);
      return found ? found.color : 'blue';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const color = getCategoryColor(category);

    if (editingId) {
        // Update existing
        const updated: Reminder = {
            id: editingId,
            title,
            description: desc,
            time,
            date: formDate,
            color,
            category,
            repeat,
            createdAt: Date.now(),
        };
        onUpdateReminder(updated);
    } else {
        // Create new
        const newReminder: Reminder = {
            id: crypto.randomUUID(),
            title,
            description: desc,
            time,
            date: formDate,
            color,
            category,
            repeat,
            createdAt: Date.now(),
        };
        onAddReminder(newReminder);
    }
    
    resetForms();
  };

  const handleTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoText.trim()) return;

    if (editingId) {
        const existing = todos.find(t => t.id === editingId);
        if (existing) {
            onUpdateTodo({ ...existing, text: todoText });
        }
    } else {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            text: todoText,
            completed: false,
            date: dateStr,
            createdAt: Date.now(), // Newest will have highest timestamp
        };
        onAddTodo(newTodo);
    }
    resetForms();
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsProcessing(true);
    setAiError('');

    try {
      const result = await parseNaturalLanguageEvent(aiPrompt, dateStr, language);
      if (result) {
        const newReminder: Reminder = {
          id: crypto.randomUUID(),
          title: result.title,
          description: result.description,
          time: result.time,
          date: result.date,
          color: 'blue',
          category: 'work', // Default to work for AI for now
          repeat: 'none',
          alerts: [],
          createdAt: Date.now(),
        };
        onAddReminder(newReminder);
        setAiPrompt('');
        if (result.date !== dateStr) {
           alert(`${t.eventAdded} ${result.date} ${t.notView}`);
        }
      } else {
        setAiError(t.aiError);
      }
    } catch (err) {
      setAiError(t.aiConnError);
    } finally {
      setIsProcessing(false);
    }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!onReorderTodo) return;
    setDraggedTodoId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires dataTransfer to be set
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
     if (!onReorderTodo) return;
     e.preventDefault();
     e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
     if (!onReorderTodo) return;
     e.preventDefault();
     if (draggedTodoId && draggedTodoId !== targetId) {
        onReorderTodo(draggedTodoId, targetId);
     }
     setDraggedTodoId(null);
  };

  const displayDate = new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-[80] flex flex-col border-l border-gray-200 dark:border-gray-800">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{displayDate}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
             {reminders.length} {t.reminders} • {todos.filter(t => !t.completed).length} {t.todoList}
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
          <X size={24} />
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button 
             onClick={() => { setActiveTab('events'); resetForms(); }}
             className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'events' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
             <CalendarIcon size={16} /> {t.reminders}
             {activeTab === 'events' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />}
          </button>
          <button 
             onClick={() => { setActiveTab('todos'); resetForms(); }}
             className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'todos' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
             <ListTodo size={16} /> {t.todoList}
             {activeTab === 'todos' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />}
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 custom-scrollbar">
        
        {/* EVENTS TAB */}
        {activeTab === 'events' && (
            <div className="p-4 space-y-3">
                 {reminders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                        <Clock size={48} className="mx-auto mb-3 opacity-20" />
                        <p>{t.noEventsToday}</p>
                    </div>
                 ) : (
                    reminders.sort((a, b) => a.time.localeCompare(b.time)).map((rem) => (
                        <div key={rem.id} className={`group relative flex flex-col p-3 bg-white dark:bg-gray-800/60 border rounded-xl shadow-sm hover:shadow-md transition-all ${editingId === rem.id ? 'ring-2 ring-primary-500 border-transparent' : 'border-gray-100 dark:border-gray-800'}`}>
                            <div className="flex items-center w-full">
                                <div className={`w-2 h-2 rounded-full mr-3 shrink-0 shadow-sm ${
                                    rem.color === 'red' ? 'bg-red-500 shadow-red-500/50' :
                                    rem.color === 'green' ? 'bg-green-500 shadow-green-500/50' :
                                    rem.color === 'purple' ? 'bg-purple-500 shadow-purple-500/50' :
                                    rem.color === 'orange' ? 'bg-orange-500 shadow-orange-500/50' :
                                    rem.color === 'gray' ? 'bg-gray-500 shadow-gray-500/50' :
                                    'bg-blue-500 shadow-blue-500/50'
                                }`} />
                                
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <h4 className="font-semibold text-base text-gray-800 dark:text-gray-100 truncate">{rem.title}</h4>
                                    <span className="text-sm font-mono text-gray-400 dark:text-gray-500">{rem.time}</span>
                                    {rem.repeat && rem.repeat !== 'none' && (
                                        <div className="flex items-center text-gray-400" title={rem.repeat}>
                                            <Repeat size={12} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                    <button 
                                        onClick={() => handleEditReminder(rem)}
                                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                                        title={t.edit}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteReminder(rem.id)}
                                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        title={t.delete}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {(rem.description || rem.category) && (
                                <div className="pl-5 mt-1 flex flex-col gap-1">
                                    {rem.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{rem.description}</p>}
                                    {rem.category && (
                                        <div className="flex">
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
                                                {t[`cat_${rem.category}` as keyof typeof t]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                 )}
            </div>
        )}

        {/* TODOS TAB */}
        {activeTab === 'todos' && (
            <div className="p-6 space-y-3">
                 {todos.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                        <ListTodo size={48} className="mx-auto mb-3 opacity-20" />
                        <p>{t.noEventsToday}</p>
                    </div>
                 ) : (
                     todos.map(todo => (
                        <div 
                            key={todo.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, todo.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, todo.id)}
                            className={`group flex items-center p-4 bg-white dark:bg-gray-800/60 border rounded-xl transition-all ${
                                editingId === todo.id ? 'ring-2 ring-primary-500 border-transparent' : 'border-gray-100 dark:border-gray-800 shadow-sm'
                            } ${draggedTodoId === todo.id ? 'opacity-50 border-dashed border-primary-300' : ''}`}
                        >
                             <div className="mr-2 text-gray-300 dark:text-gray-600 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={16} />
                             </div>
                             <button 
                                onClick={() => onToggleTodo(todo.id)}
                                className={`mr-2 transition-colors ${todo.completed ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600 hover:text-primary-500'}`}
                             >
                                 {todo.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                             </button>
                             <span className={`flex-1 text-base ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                 {todo.text}
                             </span>
                             
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button 
                                    onClick={() => handleEditTodo(todo)}
                                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                                    title={t.edit}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button 
                                    onClick={() => onDeleteTodo(todo.id)}
                                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title={t.delete}
                                >
                                    <Trash2 size={16} />
                                </button>
                             </div>
                        </div>
                     ))
                 )}
            </div>
        )}
      </div>

      {/* Input Section */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 z-20">
        
        {/* Mode Toggle (Only show if not editing, or allow edit to override) */}
        {!editingId && activeTab === 'events' && (
            <div className="flex space-x-4 mb-4">
                <button
                    onClick={() => setAddMode('manual')}
                    className={`pb-1 text-xs font-semibold uppercase tracking-wider transition-colors ${addMode === 'manual' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {t.manualAdd}
                </button>
                <button
                    onClick={() => setAddMode('ai')}
                    className={`pb-1 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${addMode === 'ai' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Sparkles size={12} /> {t.aiAdd}
                </button>
            </div>
        )}

        {/* Edit Mode Header */}
        {editingId && (
            <div className="flex items-center justify-between mb-4 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-100 dark:border-yellow-800/50">
                <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-500 flex items-center gap-2">
                    <Pencil size={12} /> {activeTab === 'events' ? t.edit : t.edit} Mode
                </span>
                <button 
                    onClick={resetForms}
                    className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                >
                    <XCircle size={12} /> {t.cancelEdit}
                </button>
            </div>
        )}

        {/* Form Logic */}
        {activeTab === 'todos' ? (
             <form onSubmit={handleTodoSubmit} className="flex gap-2">
                 <input
                    type="text"
                    placeholder={t.todoPlaceholder}
                    value={todoText}
                    onChange={(e) => setTodoText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                    autoFocus={!!editingId}
                 />
                 <button
                    type="submit"
                    disabled={!todoText.trim()}
                    className={`${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700'} disabled:opacity-50 text-white rounded-xl px-4 flex items-center justify-center transition-colors`}
                 >
                     {editingId ? <Save size={20} /> : <Plus size={20} />}
                 </button>
             </form>
        ) : addMode === 'manual' || editingId ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              placeholder={t.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              required
            />
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
               <div className="flex-1">
                 <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block pl-1">{t.dateLabel}</label>
                 <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    required
                 />
               </div>
               <div className="flex-1">
                  <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block pl-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    required
                  />
               </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
               <div className="flex-1">
                  <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block pl-1">{t.repeatLabel}</label>
                  <div className="relative">
                      <select
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value as RepeatFrequency)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                      >
                        <option value="none">{t.repeatNone}</option>
                        <option value="daily">{t.repeatDaily}</option>
                        <option value="weekly">{t.repeatWeekly}</option>
                        <option value="monthly">{t.repeatMonthly}</option>
                        <option value="yearly">{t.repeatYearly}</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                  </div>
               </div>
               
               <div className="flex-1">
                    <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block pl-1">{t.categoryLabel}</label>
                    <div className="relative">
                        <select
                           value={category}
                           onChange={(e) => setCategory(e.target.value as EventCategory)}
                           className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none appearance-none capitalize"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{t[`cat_${c.value}` as keyof typeof t]}</option>
                            ))}
                        </select>
                        <Tag size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                        <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
               </div>
            </div>

            <textarea
              placeholder={t.descPlaceholder}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20 text-sm"
            />
            <button
              type="submit"
              className={`w-full ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700'} text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20`}
            >
              {editingId ? <Save size={18} /> : <Plus size={18} />} 
              {editingId ? t.updateReminder : t.addReminder}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAiSubmit} className="space-y-3">
            <div className="relative">
              <textarea
                placeholder={t.aiPlaceholder}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-900/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-28 text-sm"
              />
              <Sparkles className="absolute right-3 top-3 text-purple-400 opacity-50" size={16} />
            </div>
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
            <button
              type="submit"
              disabled={isProcessing || !aiPrompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isProcessing ? t.aiThinking : t.aiButton}
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
              {t.aiFooter}
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default DayPanel;

function ChevronDown(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}