import { prisma } from '../db';
import { AppError } from '../middleware/errorHandler';
import { addDays, parseISO, format } from 'date-fns';

export interface MealPlanState {
  startDate: string | null;
  days: DayPlan[];
  currentDay: string | null;
}

export interface DayPlan {
  date: string;
  meals: Meal[];
}

export interface Meal {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Get the complete meal plan with all days and meals
 */
export async function getMealPlan(): Promise<MealPlanState> {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
    include: {
      days: {
        include: {
          meals: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!plan) {
    throw new AppError(404, 'Meal plan not found');
  }

  return {
    startDate: plan.startDate,
    currentDay: plan.currentDay,
    days: plan.days.map((day) => ({
      date: day.date,
      meals: day.meals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        createdAt: meal.createdAt,
      })),
    })),
  };
}

/**
 * Set the start date for the meal plan
 */
export async function setStartDate(startDate: string): Promise<MealPlanState> {
  const plan = await prisma.mealPlan.update({
    where: { id: 'singleton' },
    data: {
      startDate,
      currentDay: startDate,
    },
  });

  return getMealPlan();
}

/**
 * Add a meal to a specific day or the current day
 */
export async function addMeal(name: string, day?: string): Promise<Meal> {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
  });

  if (!plan) {
    throw new AppError(404, 'Meal plan not found');
  }

  if (!plan.startDate) {
    throw new AppError(400, 'Start date must be set before adding meals');
  }

  // Use provided day or current day
  const targetDay = day || plan.currentDay || plan.startDate;

  // Find or create the day plan
  let dayPlan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: targetDay,
    },
  });

  if (!dayPlan) {
    dayPlan = await prisma.dayPlan.create({
      data: {
        mealPlanId: 'singleton',
        date: targetDay,
      },
    });
  }

  // Create the meal
  const meal = await prisma.meal.create({
    data: {
      name,
      dayPlanId: dayPlan.id,
    },
  });

  // Update current day to next day if not manually specified
  if (!day) {
    const currentDate = parseISO(targetDay);
    const nextDay = format(addDays(currentDate, 1), 'yyyy-MM-dd');
    await prisma.mealPlan.update({
      where: { id: 'singleton' },
      data: { currentDay: nextDay },
    });
  }

  return {
    id: meal.id,
    name: meal.name,
    createdAt: meal.createdAt,
  };
}

/**
 * Delete a meal and shift days if necessary
 */
export async function deleteMeal(mealId: string, day: string): Promise<void> {
  // Find the day plan
  const dayPlan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: day,
    },
    include: {
      meals: true,
    },
  });

  if (!dayPlan) {
    throw new AppError(404, 'Day not found');
  }

  // Delete the meal
  await prisma.meal.delete({
    where: { id: mealId },
  });

  // Check if day is now empty
  const remainingMeals = await prisma.meal.count({
    where: { dayPlanId: dayPlan.id },
  });

  if (remainingMeals === 0) {
    // Delete the empty day
    await prisma.dayPlan.delete({
      where: { id: dayPlan.id },
    });

    // Shift all subsequent days back by one
    await shiftDaysAfterDeletion(day);
  }
}

/**
 * Shift all days after a deleted day back by one day
 */
async function shiftDaysAfterDeletion(deletedDay: string): Promise<void> {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
    include: {
      days: {
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!plan || !plan.startDate) return;

  const deletedDate = parseISO(deletedDay);
  const startDate = parseISO(plan.startDate);

  // Get all days after the deleted day
  const daysToShift = plan.days.filter((day) => {
    const dayDate = parseISO(day.date);
    return dayDate > deletedDate;
  });

  // Shift each day back by one
  for (const day of daysToShift) {
    const currentDate = parseISO(day.date);
    const newDate = format(addDays(currentDate, -1), 'yyyy-MM-dd');

    await prisma.dayPlan.update({
      where: { id: day.id },
      data: { date: newDate },
    });
  }

  // Update current day if needed
  if (plan.currentDay) {
    const currentDate = parseISO(plan.currentDay);
    if (currentDate > deletedDate) {
      const newCurrentDay = format(addDays(currentDate, -1), 'yyyy-MM-dd');
      await prisma.mealPlan.update({
        where: { id: 'singleton' },
        data: { currentDay: newCurrentDay },
      });
    }
  }
}

/**
 * Move a meal from one day to another
 */
export async function moveMeal(
  mealId: string,
  sourceDay: string,
  targetDay: string
): Promise<void> {
  // Find or create target day plan
  let targetDayPlan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: targetDay,
    },
  });

  if (!targetDayPlan) {
    targetDayPlan = await prisma.dayPlan.create({
      data: {
        mealPlanId: 'singleton',
        date: targetDay,
      },
    });
  }

  // Find source day plan to check if it will be empty
  const sourceDayPlan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: sourceDay,
    },
    include: {
      meals: true,
    },
  });

  if (!sourceDayPlan) {
    throw new AppError(404, 'Source day not found');
  }

  // Move the meal
  await prisma.meal.update({
    where: { id: mealId },
    data: { dayPlanId: targetDayPlan.id },
  });

  // Check if source day is now empty and delete if so
  const remainingMeals = sourceDayPlan.meals.filter((m) => m.id !== mealId);
  if (remainingMeals.length === 0) {
    await prisma.dayPlan.delete({
      where: { id: sourceDayPlan.id },
    });

    // Shift subsequent days
    await shiftDaysAfterDeletion(sourceDay);
  }
}

/**
 * Swap two meals between days
 */
export async function swapMeals(
  meal1Id: string,
  meal1Day: string,
  meal2Id: string,
  meal2Day: string
): Promise<void> {
  // Find both day plans
  const day1Plan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: meal1Day,
    },
  });

  const day2Plan = await prisma.dayPlan.findFirst({
    where: {
      mealPlanId: 'singleton',
      date: meal2Day,
    },
  });

  if (!day1Plan || !day2Plan) {
    throw new AppError(404, 'One or both days not found');
  }

  // Swap the meals
  await prisma.$transaction([
    prisma.meal.update({
      where: { id: meal1Id },
      data: { dayPlanId: day2Plan.id },
    }),
    prisma.meal.update({
      where: { id: meal2Id },
      data: { dayPlanId: day1Plan.id },
    }),
  ]);
}

/**
 * Reset the entire meal plan, archiving the current one first
 */
export async function resetMealPlan(): Promise<void> {
  // Archive the current meal plan before resetting
  const plan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
    include: {
      days: {
        include: {
          meals: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (plan && plan.startDate && plan.days.length > 0) {
    const lastDay = plan.days[plan.days.length - 1].date;
    const snapshot = plan.days.map((day) => ({
      date: day.date,
      meals: day.meals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        createdAt: meal.createdAt,
      })),
    }));

    await prisma.archivedMealPlan.create({
      data: {
        startDate: plan.startDate,
        endDate: lastDay,
        data: JSON.stringify(snapshot),
      },
    });
  }

  await prisma.mealPlan.update({
    where: { id: 'singleton' },
    data: {
      startDate: null,
      currentDay: null,
      days: {
        deleteMany: {},
      },
    },
  });
}

/**
 * Get archived meal plan history
 */
export async function getMealPlanHistory(): Promise<ArchivedMealPlan[]> {
  const archived = await prisma.archivedMealPlan.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return archived.map((plan) => {
    let days: DayPlan[] = [];
    try {
      days = JSON.parse(plan.data);
    } catch {
      days = [];
    }
    return {
      id: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      days,
      createdAt: plan.createdAt,
    };
  });
}

export interface ArchivedMealPlan {
  id: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  createdAt: Date;
}
