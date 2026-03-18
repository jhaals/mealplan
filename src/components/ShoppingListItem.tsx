import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ShoppingListItem as ShoppingListItemType } from '../types';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ShoppingListItem({ item, onToggle, onDelete }: ShoppingListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-3 py-2 group
        hover:bg-cream-100 dark:hover:bg-charcoal-700/50
        transition-all duration-200
        border-b border-cream-200/50 dark:border-charcoal-700/50
        ${isDragging ? 'opacity-50 bg-cream-100 dark:bg-charcoal-700 shadow-medium z-50' : ''}
      `}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all p-1"
        {...listeners}
        {...attributes}
      >
        <svg className="w-4 h-4 text-sage-300 dark:text-charcoal-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Custom Checkbox with spring bounce */}
      <button
        onClick={() => onToggle(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center min-w-[36px] min-h-[36px] hover:bg-cream-200 dark:hover:bg-charcoal-600 transition-colors"
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
      >
        <div
          className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center
            transition-all duration-200
            ${item.checked
              ? 'border-primary-500 bg-primary-500 scale-100 animate-[checkboxBounce_0.3s_ease-out]'
              : 'border-sage-300 dark:border-charcoal-500 bg-transparent hover:border-primary-400'
            }
          `}
        >
          {item.checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Item name with enhanced strikethrough */}
      <span
        className={`
          flex-1 text-sm font-medium transition-all duration-300
          ${item.checked
            ? 'line-through text-charcoal-400 dark:text-charcoal-500 opacity-60'
            : 'text-charcoal-800 dark:text-cream-100'
          }
        `}
      >
        {item.name}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="
          flex-shrink-0 p-2
          text-sage-300 dark:text-charcoal-500
          hover:text-red-600 dark:hover:text-red-400
          hover:bg-red-50 dark:hover:bg-red-900/20
          rounded-lg
          transition-all duration-200
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100
          min-w-[36px] min-h-[36px]
          flex items-center justify-center
        "
        aria-label="Delete item"
      >
        <svg className="w-3.5 h-3.5 transition-transform hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
