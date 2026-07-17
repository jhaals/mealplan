import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { ShoppingListItem as ShoppingListItemType } from '../types';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ShoppingListItem({ item, onToggle, onDelete }: ShoppingListItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { opacity: 0.5, boxShadow: 'var(--shadow-lift)', zIndex: 50 } : null),
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1 px-2 py-1 rounded-xl transition-colors"
    >
      <span
        className="shrink-0 grid place-items-center cursor-grab active:cursor-grabbing touch-none text-muted transition-colors group-hover:text-ink"
        style={{ width: 28, height: 28 }}
        {...listeners}
        {...attributes}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M5 9h14M5 15h14" />
        </svg>
      </span>

      {/* Mint means done-ness everywhere in this app. */}
      <button
        onClick={() => onToggle(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 grid place-items-center rounded-lg"
        style={{ width: 44, height: 44, minWidth: 44 }}
        aria-pressed={item.checked}
        aria-label={item.checked ? t('aria.uncheckItem') : t('aria.checkItem')}
      >
        <span
          className="grid place-items-center rounded-md transition-[background-color,border-color]"
          style={{
            width: 20,
            height: 20,
            border: `2px solid ${item.checked ? 'var(--color-mint)' : 'var(--color-rule)'}`,
            background: item.checked ? 'var(--color-mint)' : 'transparent',
            transitionDuration: 'var(--dur-hover)',
          }}
        >
          {item.checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-ink)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 13 4 4L19 7" />
            </svg>
          )}
        </span>
      </button>

      <span
        className="flex-1 min-w-0 text-sm font-medium break-words transition-colors"
        style={
          item.checked
            ? { textDecoration: 'line-through', color: 'var(--color-ink-2)', opacity: 0.7 }
            : { color: 'var(--color-ink)' }
        }
      >
        {item.name}
      </span>

      <button
        onClick={() => onDelete(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3"
        style={{ width: 44, height: 44, minWidth: 44 }}
        aria-label={t('aria.deleteItem')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}
