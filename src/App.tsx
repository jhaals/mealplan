import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMealPlanner } from './hooks/useMealPlanner';
import { DatePicker } from './components/DatePicker';
import { AddMealForm } from './components/AddMealForm';
import { MealList } from './components/MealList';
import { MealCard } from './components/MealCard';
import { MealPlanHistory } from './components/MealPlanHistory';
import { ShoppingList } from './components/ShoppingList';
import { TodoList } from './components/TodoList';
import { TRMNLPage } from './components/TRMNLPage';
import { ThemeToggle } from './components/ThemeToggle';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import type { Meal } from './types';

function MealPlanPage() {
  const { t } = useTranslation();
  const {
    state,
    isLoading,
    isSaving,
    error,
    setStartDate,
    addMeal,
    deleteMeal,
    moveMeal,
    swapMeals,
    reset,
    retry
  } = useMealPlanner();
  const [activeMeal, setActiveMeal] = useState<{ meal: Meal; day: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan');

  // Configure sensors for drag and drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const mealId = active.id as string;
    const day = active.data.current?.day as string;

    const dayPlan = state.days.find((d) => d.date === day);
    const meal = dayPlan?.meals.find((m) => m.id === mealId);

    if (meal && day) {
      setActiveMeal({ meal, day });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveMeal(null);

    if (!over) return;

    const draggedMealId = active.id as string;
    const draggedMealDay = active.data.current?.day as string;

    const isDropOnMeal = over.data.current?.type === 'meal';

    if (isDropOnMeal) {
      const targetMealId = over.id as string;
      const targetMealDay = over.data.current?.day as string;

      if (draggedMealDay !== targetMealDay && draggedMealId !== targetMealId) {
        swapMeals(draggedMealId, draggedMealDay, targetMealId, targetMealDay);
      }
    } else {
      const targetDay = over.id as string;
      if (draggedMealDay !== targetDay) {
        moveMeal(draggedMealId, draggedMealDay, targetDay);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-primary-600 border-t-transparent mb-5"></div>
          <p className="text-charcoal-600 dark:text-cream-300 font-medium">{t('messages.loadingMealPlan')}</p>
        </div>
      </div>
    );
  }

  if (error && !state.startDate) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md px-4">
          <Card variant="elevated" className="p-8 mb-6">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <h2 className="text-xl font-display font-semibold text-red-900 dark:text-red-200 mb-3">{t('headings.errorLoadingMealPlan')}</h2>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </Card>
          <Button
            onClick={retry}
            size="lg"
          >
            {t('buttons.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Saving indicator */}
      {isSaving && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2.5 text-sm text-charcoal-600 dark:text-cream-300">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
            <span className="font-medium">{t('buttons.saving')}</span>
          </div>
        </div>
      )}

      {/* Error banner for non-critical errors */}
      {error && state.startDate && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-start justify-between shadow-soft">
            <div className="flex-1">
              <p className="text-red-900 dark:text-red-200 font-semibold mb-1">{t('headings.error')}</p>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={retry}
              className="ml-4 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 hover:text-white dark:hover:text-white bg-transparent hover:bg-red-600 dark:hover:bg-red-600 font-semibold rounded-lg transition-all"
            >
              {t('buttons.retry')}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto">
        {!state.startDate ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="text-center mb-10 animate-[fadeIn_0.5s_ease-out]">
              <h2 className="text-4xl font-display font-bold text-charcoal-800 dark:text-cream-100 mb-3">
                {t('headings.welcomeToMealPlan')}
              </h2>
              <p className="text-lg text-charcoal-600 dark:text-cream-300 max-w-md mx-auto">
                {t('messages.startPlanningInstructions')}
              </p>
            </div>
            <DatePicker value={state.startDate} onChange={setStartDate} />

            <div className="mt-10">
              <button
                onClick={() => setActiveTab(activeTab === 'history' ? 'plan' : 'history')}
                className="px-5 py-2.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-xl transition-all hover:shadow-soft"
              >
                {activeTab === 'history' ? t('tabs.back') : t('tabs.viewPrevious')}
              </button>
            </div>

            {activeTab === 'history' && (
              <div className="w-full max-w-3xl mt-4">
                <MealPlanHistory />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabs + Reset */}
            <div className="max-w-3xl mx-auto px-4 pt-4">
              <div className="flex items-center justify-between border-b border-cream-300 dark:border-charcoal-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`
                      px-5 py-2.5 text-sm font-semibold
                      border-b-2 transition-all duration-200
                      relative
                      ${activeTab === 'plan'
                        ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                        : 'border-transparent text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
                      }
                    `}
                  >
                    {t('tabs.currentPlan')}
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`
                      px-5 py-2.5 text-sm font-semibold
                      border-b-2 transition-all duration-200
                      relative
                      ${activeTab === 'history'
                        ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                        : 'border-transparent text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
                      }
                    `}
                  >
                    {t('tabs.history')}
                  </button>
                </div>
                <button
                  onClick={reset}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-charcoal-700 dark:text-cream-200 bg-cream-100 dark:bg-charcoal-700 border border-cream-300 dark:border-charcoal-600 rounded-xl hover:bg-sage-100 dark:hover:bg-charcoal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft mb-1"
                >
                  {t('buttons.startNewWeek')}
                </button>
              </div>
            </div>

            {activeTab === 'plan' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="max-w-3xl mx-auto p-4">
                  <div className="mb-4">
                    <AddMealForm
                      currentDay={state.currentDay}
                      onAddMeal={addMeal}
                    />
                  </div>

                  <MealList
                    days={state.days}
                    onDeleteMeal={deleteMeal}
                    onMoveMeal={moveMeal}
                  />
                </div>

                <DragOverlay>
                  {activeMeal ? (
                    <div className="opacity-90 scale-105 rotate-2">
                      <MealCard
                        meal={activeMeal.meal}
                        day={activeMeal.day}
                        onDelete={() => {}}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="max-w-3xl mx-auto p-4">
                <MealPlanHistory />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function AppHeader() {
  const { t } = useTranslation();

  return (
    <header className="
      bg-white/80 dark:bg-charcoal-800/80
      backdrop-blur-xl backdrop-saturate-150
      shadow-soft
      border-b border-cream-300/50 dark:border-charcoal-700/50
      sticky top-0 z-50
    ">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <nav className="flex gap-2 relative">
            <NavLink
              to="/meals"
              className={({ isActive }) =>
                `
                  px-5 py-2 text-sm font-semibold rounded-xl
                  transition-all duration-300 ease-out
                  relative overflow-hidden
                  ${isActive
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }
                `
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 animate-[fadeIn_0.3s_ease-out]"></div>
                  )}
                  <span className="relative z-10">{t('navigation.mealPlan')}</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/shopping"
              className={({ isActive }) =>
                `
                  px-5 py-2 text-sm font-semibold rounded-xl
                  transition-all duration-300 ease-out
                  relative overflow-hidden
                  ${isActive
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }
                `
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 animate-[fadeIn_0.3s_ease-out]"></div>
                  )}
                  <span className="relative z-10">{t('navigation.shoppingList')}</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/todos"
              className={({ isActive }) =>
                `
                  px-5 py-2 text-sm font-semibold rounded-xl
                  transition-all duration-300 ease-out
                  relative overflow-hidden
                  ${isActive
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }
                `
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 animate-[fadeIn_0.3s_ease-out]"></div>
                  )}
                  <span className="relative z-10">{t('navigation.todoList')}</span>
                </>
              )}
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `
                  p-2.5 rounded-xl
                  transition-all duration-200
                  flex items-center justify-center
                  ${isActive
                    ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-charcoal-500 dark:text-cream-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-cream-100 dark:hover:bg-charcoal-700'
                  }
                `
              }
              aria-label={t('navigation.settings')}
            >
              <svg className="w-5 h-5 transition-transform hover:rotate-90 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NavLink>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-sage-100 dark:from-charcoal-900 dark:via-charcoal-900 dark:to-charcoal-800">
      <AppHeader />
      <Routes>
        <Route path="/meals" element={<MealPlanPage />} />
        <Route path="/shopping" element={<ShoppingList />} />
        <Route path="/todos" element={<TodoList />} />
        <Route path="/settings" element={<TRMNLPage />} />
        <Route path="*" element={<Navigate to="/meals" replace />} />
      </Routes>
    </div>
  );
}

export default App;
