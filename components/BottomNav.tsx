import React from 'react';
import { Calendar, ListTodo, PieChart, User, CalendarDays } from 'lucide-react';
import { MobileTab, Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  language: Language;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, language }) => {
  const t = TRANSLATIONS[language];

  const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
    { id: 'calendar', label: t.tabCalendar, icon: Calendar },
    { id: 'today', label: t.tabToday, icon: CalendarDays },
    { id: 'todos', label: t.tabTodos, icon: ListTodo },
    { id: 'stats', label: t.tabStats, icon: PieChart },
    { id: 'profile', label: t.tabProfile, icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe z-40">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-2.5 w-full transition-colors ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={20} className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;