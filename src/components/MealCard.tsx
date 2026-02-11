import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card } from './ui/Card';
import { formatDayDisplay } from '../utils/dateHelpers';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  day: string;
  onDelete: (mealId: string, day: string) => void;
}

export function MealCard({ meal, day, onDelete }: MealCardProps) {
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
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 mb-2 cursor-grab active:cursor-grabbing group ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Drag Handle */}
        <div className="flex-shrink-0 touch-none">
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        {/* Day Info */}
        <div className="flex-shrink-0 text-sm w-24">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{dayName}</div>
          <div className="text-gray-600 dark:text-gray-400">{dateStr}</div>
        </div>

        {/* Meal Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{meal.name}</h4>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Delete meal"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
