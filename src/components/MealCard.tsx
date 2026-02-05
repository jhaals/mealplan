import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card } from './ui/Card';
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

  const handleDelete = () => {
    if (confirm('Delete this meal?')) {
      onDelete(meal.id, day);
    }
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 mb-3 ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Drag Handle */}
        <div
          {...listeners}
          {...attributes}
          className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <svg
            className="w-5 h-5 text-gray-400"
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

        {/* Meal Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-base mb-1">{meal.name}</h4>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Delete meal"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </Card>
  );
}
