import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { formatDayDisplay } from '../utils/dateHelpers';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  day: string;
  onDelete: (mealId: string, day: string) => void;
}

export function MealCard({ meal, day, onDelete }: MealCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: meal.id,
    data: {
      meal,
      day,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: meal.id,
    data: {
      type: 'meal',
      meal,
      day,
    },
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(meal.id, day);
  };

  const { dayName, dateStr } = formatDayDisplay(day);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? '3deg' : '0deg'})`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="interactive"
      className={`
        p-4 mb-3 cursor-grab active:cursor-grabbing group
        transition-all duration-300 ease-out
        ${isDragging ? 'opacity-60 shadow-raised scale-105 z-50' : ''}
        ${isOver ? 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/20' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div className="flex-shrink-0 touch-none transition-transform group-hover:scale-110">
          <svg
            className="w-5 h-5 text-sage-300 dark:text-charcoal-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        {/* Day Badge */}
        <div className="flex-shrink-0">
          <div className="
            px-3 py-1.5 rounded-full
            bg-gradient-to-br from-primary-500 to-primary-600
            text-white text-xs font-semibold
            shadow-soft
            min-w-[80px] text-center
          ">
            <div className="font-display text-sm">{dayName}</div>
            <div className="opacity-90 text-[10px] font-normal">{dateStr}</div>
          </div>
        </div>

        {/* Meal Content */}
        <div className="flex-1 min-w-0">
          <h4 className="
            font-display font-semibold text-lg
            text-charcoal-800 dark:text-cream-100
            leading-tight
          ">
            {meal.name}
          </h4>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          onPointerDown={(e) => e.stopPropagation()}
          className="
            flex-shrink-0 p-2
            text-sage-300 dark:text-charcoal-500
            hover:text-red-600 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            rounded-xl
            transition-all duration-200
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
          "
          aria-label={t('aria.deleteMeal')}
        >
          <svg
            className="w-4 h-4 transition-transform hover:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
