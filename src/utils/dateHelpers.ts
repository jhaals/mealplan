import { format, addDays, startOfDay } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import type { DayPlan } from '../types';
import i18n from '../locales';

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
 * Get date-fns locale based on current i18n language
 */
function getDateLocale() {
  const language = i18n.language;
  return language === 'sv' ? sv : enUS;
}

/**
 * Formats a date for display
 * Returns: { dayName: "Monday", dateStr: "Jan 15" } (English)
 * or: { dayName: "Måndag", dateStr: "jan 15" } (Swedish)
 */
export function formatDayDisplay(date: string): { dayName: string; dateStr: string } {
  const d = new Date(date);
  const locale = getDateLocale();
  return {
    dayName: format(d, 'EEEE', { locale }), // "Monday" or "Måndag"
    dateStr: format(d, 'MMM d', { locale }), // "Jan 15" or "jan 15"
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
