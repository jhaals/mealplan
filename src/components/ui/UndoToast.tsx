import { useTranslation } from 'react-i18next';

interface UndoToastProps {
  message: string;
  itemName: string;
  onUndo: () => void;
}

/* Optimistic update + Undo, never a confirmation dialog. The toast exists only
 * to carry the undo — success itself stays silent. Sits clear of the fixed tab
 * bar and its safe-area inset. */
export function UndoToast({ message, itemName, onUndo }: UndoToastProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 px-3 w-full max-w-md"
      style={{
        bottom: `calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + var(--space-xs))`,
        animation: 'hum-rise 220ms var(--ease-snap)',
      }}
      role="status"
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-full"
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-paper)',
          boxShadow: 'var(--shadow-lift)',
        }}
      >
        <span className="text-sm font-medium truncate">
          {message} <span className="font-semibold">{itemName}</span>
        </span>
        <button
          onClick={onUndo}
          className="text-sm font-bold shrink-0 rounded-full px-2"
          style={{ color: 'var(--color-accent)', minHeight: 'auto', minWidth: 'auto' }}
        >
          {t('buttons.undo')}
        </button>
      </div>
    </div>
  );
}
