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
      className={`flex items-center gap-1 px-2 py-0.5 group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
        isDragging ? 'opacity-50 bg-gray-50 dark:bg-gray-700' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5"
        {...listeners}
        {...attributes}
      >
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center min-w-[32px] min-h-[32px]"
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
      >
        <div
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: item.checked ? '#22c55e' : '#d1d5db',
            backgroundColor: item.checked ? '#22c55e' : 'transparent',
          }}
        >
          {item.checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Item name */}
      <span
        className={`flex-1 text-xs ${
          item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {item.name}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Delete item"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
