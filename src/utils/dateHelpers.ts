import { format, addDays, startOfDay } from 'date-fns';
import type { DayPlan } from '../types';

/**
 * Creates a single DayPlan object for a given date
 */
export function createDay(date: string): DayPlan {
  return {
    date,
    meals: [],
  };
}

/**
 * Returns the next day as an ISO date string (YYYY-MM-DD)
 */
export function getNextDay(currentDate: string): string {
  const date = new Date(currentDate);
  const nextDay = addDays(date, 1);
  return format(nextDay, 'yyyy-MM-dd');
}

/**
 * Formats a date for display
 * Returns: { dayName: "Monday", dateStr: "Jan 15" }
 */
export function formatDayDisplay(date: string): { dayName: string; dateStr: string } {
  const d = new Date(date);
  return {
    dayName: format(d, 'EEEE'), // "Monday"
    dateStr: format(d, 'MMM d'), // "Jan 15"
  };
}

/**
 * Gets an existing day or creates a new one
 */
export function getOrCreateDay(days: DayPlan[], date: string): DayPlan {
  const existing = days.find((d) => d.date === date);
  if (existing) return existing;
  return createDay(date);
}

/**
 * Converts a date to ISO date string (YYYY-MM-DD)
 */
export function toISODate(date: Date | string): string {
  if (typeof date === 'string') {
    return format(startOfDay(new Date(date)), 'yyyy-MM-dd');
  }
  return format(startOfDay(date), 'yyyy-MM-dd');
}
