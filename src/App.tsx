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
import { Button } from './components/ui/Button';
import { Segmented } from './components/ui/Segmented';
import type { Meal } from './types';

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-t-transparent ${className}`}
      style={{ borderColor: 'var(--color-accent-deep)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
      aria-hidden="true"
    />
  );
}

function Notice({ title, body, onRetry, retryLabel }: {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="card card--tint tint-coral p-4 flex items-start gap-3"
      style={{ boxShadow: 'none', border: '1.5px solid color-mix(in oklab, var(--color-accent-3) 40%, transparent)' }}
      role="alert"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted mt-0.5 break-words">{body}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn--soft btn--sm shrink-0">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

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
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Spinner className="h-10 w-10 mb-4" />
          <p className="text-muted font-medium">{t('messages.loadingMealPlan')}</p>
        </div>
      </div>
    );
  }

  if (error && !state.startDate) {
    return (
      <div className="shell py-8">
        <Notice
          title={t('headings.errorLoadingMealPlan')}
          body={error}
          onRetry={retry}
          retryLabel={t('buttons.retry')}
        />
      </div>
    );
  }

  return (
    <>
      {(isSaving || (error && state.startDate)) && (
        <div className="shell pt-3 space-y-3">
          {isSaving && (
            <p className="flex items-center gap-2 text-sm text-muted font-medium">
              <Spinner className="h-4 w-4" />
              {t('buttons.saving')}
            </p>
          )}
          {error && state.startDate && (
            <Notice
              title={t('headings.error')}
              body={error}
              onRetry={retry}
              retryLabel={t('buttons.retry')}
            />
          )}
        </div>
      )}

      <main className="shell">
        {!state.startDate ? (
          /* ---- Empty state · the character moment lives here -------------
           * Off-grid: the mark sits outboard of the heading's left edge. */
          <div className="py-10">
            <div className="flex items-start gap-3">
              <span className="mark mt-3 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h1 style={{ fontSize: 'var(--text-display)' }}>
                  {t('headings.welcomeToMealPlan')}
                </h1>
                <p className="text-md text-muted mt-3 max-w-prose">
                  {t('messages.startPlanningInstructions')}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <DatePicker value={state.startDate} onChange={setStartDate} />
            </div>

            <hr className="seam my-8" />

            <button
              onClick={() => setActiveTab(activeTab === 'history' ? 'plan' : 'history')}
              className="btn btn--outline btn--sm"
            >
              {activeTab === 'history' ? t('tabs.back') : t('tabs.viewPrevious')}
            </button>

            {activeTab === 'history' && (
              <div className="mt-6">
                <MealPlanHistory />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="pt-4 flex items-center justify-between gap-3 flex-wrap">
              <Segmented
                aria-label={t('headings.mealPlan')}
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'plan', label: t('tabs.currentPlan') },
                  { value: 'history', label: t('tabs.history') },
                ]}
              />

              <Button variant="outline" size="sm" onClick={reset} disabled={isSaving}>
                {t('buttons.startNewWeek')}
              </Button>
            </div>

            {activeTab === 'plan' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="py-5">
                  {/* The screen's heading. Visually the "Current Plan" segment
                    * already says this, so showing it twice would be wallpaper —
                    * but the document still owes assistive tech a heading, and
                    * every other route has one. */}
                  <h1 className="sr-only">{t('headings.mealPlan')}</h1>

                  <AddMealForm
                    currentDay={state.currentDay}
                    onAddMeal={addMeal}
                  />

                  <div className="mt-6">
                    <MealList
                      days={state.days}
                      onDeleteMeal={deleteMeal}
                      onMoveMeal={moveMeal}
                    />
                  </div>
                </div>

                <DragOverlay>
                  {activeMeal ? (
                    <div style={{ opacity: 0.95, transform: 'rotate(2deg)' }}>
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
              <div className="py-5">
                <MealPlanHistory />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

/* ---- Wordmark · the mark trails the name -----------------------------
 * An earlier pass swapped the mark in for the "a" — it read as "MealPlon"
 * and made screen readers announce the name twice. The mark sits alongside
 * instead: the word stays legible, the character still gets its moment. */
function Wordmark() {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-display font-semibold text-ink select-none"
      style={{ fontSize: 'var(--text-md)', letterSpacing: 'var(--tracking-display)' }}
    >
      MealPlan
      <span className="mark" aria-hidden="true" />
    </span>
  );
}

function TopBar() {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'color-mix(in oklab, var(--color-paper) 88%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: 'var(--rule-hair)',
      }}
    >
      <div className="shell flex items-center justify-between" style={{ height: '3.25rem' }}>
        <Wordmark />
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ---- Tab glyphs · drawn, never emoji --------------------------------- */
const glyphProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const TABS = [
  {
    to: '/meals',
    tint: 'tint-pear',
    key: 'navigation.mealPlan' as const,
    glyph: (
      <svg {...glyphProps}>
        <path d="M4 4v7a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V4" />
        <path d="M7 14v6" />
        <path d="M17 4c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6Z" />
        <path d="M17 13v7" />
      </svg>
    ),
  },
  {
    to: '/shopping',
    tint: 'tint-cyan',
    key: 'navigation.shoppingList' as const,
    glyph: (
      <svg {...glyphProps}>
        <path d="M5 7h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
        <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      </svg>
    ),
  },
  {
    to: '/todos',
    tint: 'tint-mint',
    key: 'navigation.todoList' as const,
    glyph: (
      <svg {...glyphProps}>
        <path d="M4 6.5h10" />
        <path d="M4 12h10" />
        <path d="M4 17.5h10" />
        <path d="M17.5 5.5 19 7l2.5-2.5" />
        <path d="M17.5 16.5 19 18l2.5-2.5" />
      </svg>
    ),
  },
  {
    to: '/settings',
    tint: '',
    key: 'navigation.settings' as const,
    /* Sliders, not a gear-with-rays — the first pass drew a sun here, which
     * collided with the theme toggle's own sun in the top bar. */
    glyph: (
      <svg {...glyphProps}>
        <path d="M5 20v-6M5 10V4M12 20v-9M12 7V4M19 20v-4M19 12V4" />
        <path d="M2.5 14h5M9.5 7h5M16.5 16h5" />
      </svg>
    ),
  },
];

function TabBar() {
  const { t } = useTranslation();

  return (
    <nav className="tabbar" aria-label={t('navigation.mealPlan')}>
      <div className="tabbar__row">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={`tab ${tab.tint}`}>
            <span className="tab__glyph">{tab.glyph}</span>
            {t(tab.key)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <div style={{ paddingBottom: `calc(var(--tabbar-h) + var(--space-lg))` }}>
        <Routes>
          <Route path="/meals" element={<MealPlanPage />} />
          <Route path="/shopping" element={<ShoppingList />} />
          <Route path="/todos" element={<TodoList />} />
          <Route path="/settings" element={<TRMNLPage />} />
          <Route path="*" element={<Navigate to="/meals" replace />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  );
}

export default App;
