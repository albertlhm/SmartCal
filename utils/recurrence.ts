import { Reminder } from '../types';

export const isOccurrence = (reminder: Reminder, targetDateStr: string): boolean => {
  if (!reminder.repeat || reminder.repeat === 'none') {
    return reminder.date === targetDateStr;
  }

  const start = new Date(reminder.date);
  const target = new Date(targetDateStr);
  
  // Reset times to compare dates only
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  // If target is before start date, it's not an occurrence
  if (target.getTime() < start.getTime()) {
    return false;
  }

  switch (reminder.repeat) {
    case 'daily':
      return true;
    case 'weekly':
      return target.getDay() === start.getDay();
    case 'monthly':
      // Simple monthly: same day of month
      // Note: If start is 31st, and target month has 30 days, this returns false (standard behavior)
      return target.getDate() === start.getDate();
    case 'yearly':
      return target.getMonth() === start.getMonth() && target.getDate() === start.getDate();
    default:
      return false;
  }
};