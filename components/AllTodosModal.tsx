import React from 'react';
import { X, CheckSquare, Square, Calendar, Trash2 } from 'lucide-react';
import { Todo, Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface AllTodosModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Record<string, Todo[]>;
  onToggleTodo: (id: string, date: string) => void;
  onDeleteTodo: (id: string) => void;
  language: Language;
}

const AllTodosModal: React.FC<AllTodosModalProps> = ({ isOpen, onClose, todos, onToggleTodo, onDeleteTodo, language }) => {
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  // Flatten and sort todos
  const allTodosList = Object.entries(todos).flatMap(([date, list]) => 
    (list as Todo[]).map(todo => ({ ...todo, dateKey: date }))
  ).sort((a, b) => {
    // Sort by date descending
    return b.dateKey.localeCompare(a.dateKey);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="text-primary-500" />
            {t.allTodos}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-black/20">
          {allTodosList.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                <CheckSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No tasks found.</p>
             </div>
          ) : (
             <div className="space-y-3">
               {allTodosList.map(todo => (
                 <div key={todo.id} className="group flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                    <button 
                       onClick={() => onToggleTodo(todo.id, todo.dateKey)}
                       className={`mr-4 transition-colors ${todo.completed ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600 hover:text-primary-500'}`}
                    >
                        {todo.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                    <div className="flex-1 min-w-0">
                       <p className={`text-base font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                           {todo.text}
                       </p>
                       <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                           <Calendar size={12} /> {todo.dateKey}
                       </p>
                    </div>
                    <button 
                        onClick={() => onDeleteTodo(todo.id)}
                        className="ml-3 p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title={t.delete}
                    >
                        <Trash2 size={18} />
                    </button>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTodosModal;