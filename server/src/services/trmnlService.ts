import { prisma } from '../db';
import { getMealPlan } from './mealPlanService';
import { createHash } from 'crypto';
import { format, parseISO } from 'date-fns';

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

/**
 * Format meal plan data for TRMNL webhook payload
 */
async function formatMealPlanForTRMNL() {
  const mealPlan = await getMealPlan();

  // If no meal plan or no start date, send empty message
  if (!mealPlan.startDate || mealPlan.days.length === 0) {
    return {
      merge_variables: {
        startDate: null,
        lastUpdated: new Date().toISOString(),
        totalDays: 0,
        totalMeals: 0,
        days: [],
        displayText: 'No meals planned',
      },
      merge_strategy: 'replace',
    };
  }

  // Format days with meals
  const formattedDays = mealPlan.days.map((day) => {
    const date = parseISO(day.date);
    return {
      date: day.date,
      dayName: format(date, 'EEE'),
      formattedDate: format(date, 'MMM d'),
      meals: day.meals.map((meal) => meal.name),
      mealCount: day.meals.length,
    };
  });

  // Calculate totals
  const totalMeals = mealPlan.days.reduce(
    (sum, day) => sum + day.meals.length,
    0
  );

  // Generate display text
  const startDateFormatted = format(parseISO(mealPlan.startDate), 'MMM d');
  let displayText = `MEAL PLAN - Week of ${startDateFormatted}\n\n`;

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
      totalDays: mealPlan.days.length,
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
    // Format the payload
    const payload = await formatMealPlanForTRMNL();

    // Generate hash of the payload for change detection
    const dataString = JSON.stringify(payload.merge_variables);
    const currentHash = generateDataHash(dataString);

    // Check if data has changed (unless force push)
    if (!force) {
      const plan = await prisma.mealPlan.findUnique({
        where: { id: 'singleton' },
        select: { lastPushHash: true },
      });

      if (plan?.lastPushHash === currentHash) {
        // No changes detected, skip push
        return {
          success: true,
          changeDetected: false,
        };
      }
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
