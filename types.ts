export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type EventCategory = 'work' | 'personal' | 'study' | 'health' | 'travel' | 'other';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD (Start date for recurring)
  time: string; // HH:mm
  color: string;
  category?: EventCategory;
  createdAt: number;
  repeat?: RepeatFrequency;
  alerts?: number[]; // Array of minutes before event to notify (e.g., [15, 60])
  isCompleted?: boolean;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string; // YYYY-MM-DD
}

export interface SmartEventExtraction {
  title: string;
  date: string;
  time: string;
  description: string;
}

export interface User {
  id: string;
  username: string;
}

export interface UserPreferences {
  theme?: 'dark' | 'light';
  language?: Language;
}

export type Language = 'zh' | 'en';

export type CalendarView = 'month' | 'week' | 'agenda';

export type MobileTab = 'calendar' | 'todos' | 'stats' | 'profile';

// History / Undo Types
export type ActionType = 'ADD_REMINDER' | 'UPDATE_REMINDER' | 'DELETE_REMINDER' | 'ADD_TODO' | 'UPDATE_TODO' | 'DELETE_TODO';

export interface HistoryItem {
  type: ActionType;
  data: any; // The data needed to revert (e.g., the deleted item, or the OLD state of an updated item)
  inverseId?: string; // ID to delete if the action was ADD
}