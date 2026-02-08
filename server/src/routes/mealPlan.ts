import { Hono } from 'hono';
import * as mealPlanService from '../services/mealPlanService';
import { AppError } from '../middleware/errorHandler';

const mealPlan = new Hono();

/**
 * GET /api/meal-plan
 * Get complete meal plan
 */
mealPlan.get('/', async (c) => {
  const plan = await mealPlanService.getMealPlan();
  return c.json(plan);
});

/**
 * PUT /api/meal-plan/start-date
 * Set start date
 */
mealPlan.put('/start-date', async (c) => {
  const body = await c.req.json();
  const { startDate } = body;

  if (!startDate || typeof startDate !== 'string') {
    throw new AppError(400, 'Start date is required');
  }

  const plan = await mealPlanService.setStartDate(startDate);
  return c.json(plan);
});

/**
 * DELETE /api/meal-plan
 * Reset entire plan (archives current plan first)
 */
mealPlan.delete('/', async (c) => {
  await mealPlanService.resetMealPlan();
  return c.body(null, 204);
});

/**
 * GET /api/meal-plan/history
 * Get archived meal plan history
 */
mealPlan.get('/history', async (c) => {
  const history = await mealPlanService.getMealPlanHistory();
  return c.json(history);
});

/**
 * DELETE /api/meal-plan/history/:id
 * Delete an archived meal plan
 */
mealPlan.delete('/history/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await mealPlanService.deleteArchivedMealPlan(id);
    return c.body(null, 204);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2025') {
      throw new AppError(404, 'Archived meal plan not found');
    }
    throw e;
  }
});

/**
 * POST /api/meals
 * Add new meal
 */
mealPlan.post('/meals', async (c) => {
  const body = await c.req.json();
  const { name, day } = body;

  if (!name || typeof name !== 'string') {
    throw new AppError(400, 'Meal name is required');
  }

  const meal = await mealPlanService.addMeal(name, day);
  return c.json(meal, 201);
});

/**
 * DELETE /api/meals/:mealId
 * Delete meal
 */
mealPlan.delete('/meals/:mealId', async (c) => {
  const mealId = c.req.param('mealId');
  const day = c.req.query('day');

  if (!day) {
    throw new AppError(400, 'Day query parameter is required');
  }

  await mealPlanService.deleteMeal(mealId, day);
  return c.body(null, 204);
});

/**
 * PUT /api/meals/:mealId/move
 * Move meal to another day
 */
mealPlan.put('/meals/:mealId/move', async (c) => {
  const mealId = c.req.param('mealId');
  const body = await c.req.json();
  const { sourceDay, targetDay } = body;

  if (!sourceDay || !targetDay) {
    throw new AppError(400, 'Source day and target day are required');
  }

  await mealPlanService.moveMeal(mealId, sourceDay, targetDay);
  return c.json({ success: true });
});

/**
 * PUT /api/meals/swap
 * Swap two meals between days
 */
mealPlan.put('/meals/swap', async (c) => {
  const body = await c.req.json();
  const { meal1Id, meal1Day, meal2Id, meal2Day } = body;

  if (!meal1Id || !meal1Day || !meal2Id || !meal2Day) {
    throw new AppError(400, 'All meal IDs and days are required');
  }

  await mealPlanService.swapMeals(meal1Id, meal1Day, meal2Id, meal2Day);
  return c.json({ success: true });
});

export default mealPlan;
