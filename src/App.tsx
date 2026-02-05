import { useState } from 'react';
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
import type { Meal } from './types';

function App() {
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

  // Configure sensors for drag and drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // 10px movement to activate drag
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms press before drag activates
      tolerance: 5, // 5px movement tolerance
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const mealId = active.id as string;
    const day = active.data.current?.day as string;

    // Find the meal being dragged
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

    // Check if dropping on another meal (swap) or on a day (move)
    const isDropOnMeal = over.data.current?.type === 'meal';

    if (isDropOnMeal) {
      // Swap meals
      const targetMealId = over.id as string;
      const targetMealDay = over.data.current?.day as string;

      if (draggedMealDay !== targetMealDay && draggedMealId !== targetMealId) {
        swapMeals(draggedMealId, draggedMealDay, targetMealId, targetMealDay);
      }
    } else {
      // Old behavior: move to day (if DayItem is still droppable)
      const targetDay = over.id as string;
      if (draggedMealDay !== targetDay) {
        moveMeal(draggedMealId, draggedMealDay, targetDay);
      }
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  // Show error screen with retry
  if (error && !state.startDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Meal Plan</h2>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={retry}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary-700">MealPrepp</h1>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                <span>Saving...</span>
              </div>
            )}
          </div>
          {state.startDate && (
            <button
              onClick={reset}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start New Week
            </button>
          )}
        </div>
      </header>

      {/* Error banner for non-critical errors */}
      {error && state.startDate && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-900 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={retry}
              className="ml-4 text-sm text-red-700 hover:text-red-900 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {!state.startDate ? (
          /* Welcome / Date Selection Screen */
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to MealPrepp
              </h2>
              <p className="text-gray-600">
                Start planning your meals by selecting a start date
              </p>
            </div>
            <DatePicker value={state.startDate} onChange={setStartDate} />
          </div>
        ) : (
          /* Main App Layout with Drag and Drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="max-w-3xl mx-auto p-4">
              {/* Add Meal Form */}
              <div className="mb-4">
                <AddMealForm
                  currentDay={state.currentDay}
                  days={state.days}
                  onAddMeal={addMeal}
                />
              </div>

              {/* Meal List */}
              <MealList
                days={state.days}
                onDeleteMeal={deleteMeal}
                onMoveMeal={moveMeal}
              />
            </div>

            {/* Drag Overlay */}
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
        )}
      </main>
    </div>
  );
}

export default App;
