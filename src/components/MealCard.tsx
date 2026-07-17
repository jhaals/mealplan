import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
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

  const style: React.CSSProperties = {
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? '2deg' : '0deg'})` }
      : null),
    ...(isDragging ? { opacity: 0.6, boxShadow: 'var(--shadow-lift)', zIndex: 50 } : null),
    ...(isOver ? { outline: '2px solid var(--color-accent-deep)', outlineOffset: '2px' } : null),
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="interactive"
      /* The day now lives on the rail, so the card carries only the meal. */
      className="group flex items-center gap-2 p-3 cursor-grab active:cursor-grabbing touch-none"
      {...listeners}
      {...attributes}
    >
      <svg
        className="shrink-0 text-muted transition-colors group-hover:text-ink"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 9h14M5 15h14" />
      </svg>

      <h4 className="flex-1 min-w-0 font-display font-semibold text-ink leading-snug break-words">
        {meal.name}
      </h4>

      <button
        onClick={handleDelete}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3"
        style={{ width: 44, height: 44 }}
        aria-label={t('aria.deleteMeal')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </Card>
  );
}
