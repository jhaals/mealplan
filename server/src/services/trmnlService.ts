import { prisma } from '../db';
import { getMealPlan, type MealPlanState } from './mealPlanService';
import { createHash } from 'crypto';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

export interface TRMNLConfig {
  enabled: boolean;
  webhookUrl: string | null;
}

export interface TRMNLPushResult {
  success: boolean;
  error?: string;
  changeDetected?: boolean;
  pushedAt?: Date;
}

export interface TRMNLPushStatus {
  lastPushAt: Date | null;
  lastPushError: string | null;
  hasPushed: boolean;
}

/**
 * Get TRMNL configuration from environment
 */
export function getTRMNLConfig(): TRMNLConfig {
  const webhookUrl = process.env.TRMNL_WEBHOOK_URL || null;
  return {
    enabled: !!webhookUrl,
    webhookUrl,
  };
}

/**
 * Get last push status from database
 */
export async function getPushStatus(): Promise<TRMNLPushStatus> {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
    select: {
      lastPushAt: true,
      lastPushError: true,
    },
  });

  if (!plan) {
    return {
      lastPushAt: null,
      lastPushError: null,
      hasPushed: false,
    };
  }

  return {
    lastPushAt: plan.lastPushAt,
    lastPushError: plan.lastPushError,
    hasPushed: !!plan.lastPushAt,
  };
}

/**
 * Generate SHA-256 hash of data for change detection
 */
function generateDataHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// date-fns's sv locale returns weekday abbreviations lowercase ("mån", "tors");
// capitalized to match how the English "EEE" format already reads ("Wed", "Thu").
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Extract stable content from meal plan for hash calculation
 * Only includes data that represents actual meal plan changes
 * Excludes timestamps and computed metadata that would cause false positives
 */
function extractStableContent(mealPlan: MealPlanState) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingDays = mealPlan.days.filter((day) => day.date >= today);

  // If no meal plan data, return minimal structure
  if (!mealPlan.startDate || upcomingDays.length === 0) {
    return {
      startDate: null,
      days: [],
    };
  }

  // Extract only: startDate, days with dates and meal names
  return {
    startDate: mealPlan.startDate,
    days: upcomingDays.map((day) => ({
      date: day.date,
      meals: day.meals.map((meal) => meal.name),
    })),
  };
}

/**
 * Format meal plan data for TRMNL webhook payload
 * Only includes today and future days, mirroring the "hide past days"
 * behavior of the meal timeline in the app itself.
 */
async function formatMealPlanForTRMNL() {
  const mealPlan = await getMealPlan();
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingDays = mealPlan.days.filter((day) => day.date >= today);

  // If no meal plan or nothing upcoming, send empty message
  if (!mealPlan.startDate || upcomingDays.length === 0) {
    return {
      merge_variables: {
        startDate: null,
        lastUpdated: new Date().toISOString(),
        totalDays: 0,
        totalMeals: 0,
        days: [],
        displayText: 'Inga måltider planerade',
      },
      merge_strategy: 'replace',
    };
  }

  // Format days with meals
  const formattedDays = upcomingDays.map((day) => {
    const date = parseISO(day.date);
    return {
      date: day.date,
      dayName: capitalize(format(date, 'EEE', { locale: sv })),
      formattedDate: format(date, 'd MMM', { locale: sv }),
      meals: day.meals.map((meal) => meal.name),
      mealCount: day.meals.length,
      isToday: day.date === today,
    };
  });

  // Calculate totals
  const totalMeals = upcomingDays.reduce(
    (sum, day) => sum + day.meals.length,
    0
  );

  // Generate display text
  const startDateFormatted = format(parseISO(formattedDays[0].date), 'd MMM', { locale: sv });
  let displayText = `MATSEDEL - Från ${startDateFormatted}\n\n`;

  for (const day of formattedDays) {
    displayText += `${day.dayName} ${day.formattedDate}:\n`;
    for (const meal of day.meals) {
      displayText += `• ${meal}\n`;
    }
    displayText += '\n';
  }

  return {
    merge_variables: {
      startDate: mealPlan.startDate,
      lastUpdated: new Date().toISOString(),
      totalDays: upcomingDays.length,
      totalMeals,
      days: formattedDays,
      displayText: displayText.trim(),
    },
    merge_strategy: 'replace',
  };
}

/**
 * Push meal plan to TRMNL device
 * @param force - If true, bypasses change detection and pushes regardless
 */
export async function pushToTRMNL(force: boolean = false): Promise<TRMNLPushResult> {
  const config = getTRMNLConfig();

  if (!config.enabled || !config.webhookUrl) {
    return {
      success: false,
      error: 'TRMNL webhook URL not configured',
    };
  }

  try {
    // Get meal plan data for hash calculation
    const mealPlan = await getMealPlan();

    // Format the payload for TRMNL display (includes timestamps, formatting)
    const payload = await formatMealPlanForTRMNL();

    // Generate hash ONLY from stable content (excludes timestamps and metadata)
    const stableContent = extractStableContent(mealPlan);
    const dataString = JSON.stringify(stableContent);
    const currentHash = generateDataHash(dataString);

    console.log('[TRMNL] Content hash:', currentHash.substring(0, 8) + '...');

    // Check if data has changed (unless force push)
    if (!force) {
      const plan = await prisma.mealPlan.findUnique({
        where: { id: 'singleton' },
        select: { lastPushHash: true },
      });

      if (plan?.lastPushHash === currentHash) {
        // No changes detected, skip push
        console.log('[TRMNL] No changes detected - skipping push');
        return {
          success: true,
          changeDetected: false,
        };
      }
      console.log('[TRMNL] Changes detected - pushing to TRMNL');
    }

    // Push to TRMNL webhook
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TRMNL API error: ${response.status} - ${errorText}`);
    }

    // Update database with successful push
    const pushedAt = new Date();
    await prisma.mealPlan.update({
      where: { id: 'singleton' },
      data: {
        lastPushHash: currentHash,
        lastPushAt: pushedAt,
        lastPushError: null,
      },
    });

    return {
      success: true,
      changeDetected: true,
      pushedAt,
    };
  } catch (error) {
    // Store error in database
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.mealPlan.update({
      where: { id: 'singleton' },
      data: {
        lastPushError: errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
