import { useState, useRef, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TodoItem } from '../types';
import { linkify } from '../utils/linkify';

interface TodoListItemProps {
  item: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string | null) => void | Promise<void>;
}

export function TodoListItem({ item, onToggle, onDelete, onUpdateDescription }: TodoListItemProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  // Expanded splits into two modes: a rendered view where URLs are clickable,
  // and the textarea. A textarea can't host live links, so editing is opt-in.
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.description ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelId = useId();
  // Whether the draft holds unsaved local edits. Server refreshes are async
  // (mutation → refreshState), so without this the draft can be reset from a
  // stale item.description in the window before the refresh lands.
  const isDirtyRef = useRef(false);

  // Adopt the stored description whenever we have no local edits pending —
  // covers the post-save refresh and SSE updates from another device.
  useEffect(() => {
    if (!isDirtyRef.current) {
      setDraft(item.description ?? '');
    }
  }, [item.description]);

  const commit = () => {
    if (!isDirtyRef.current) return;
    const trimmed = draft.trim();
    const current = item.description ?? '';
    isDirtyRef.current = false;
    if (trimmed !== current) {
      onUpdateDescription(item.id, trimmed ? trimmed : null);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    // Focus after the textarea mounts so the caret lands in it.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleToggleExpand = () => {
    if (isExpanded) {
      commit();
      setIsExpanded(false);
      setIsEditing(false);
    } else {
      setIsExpanded(true);
      // With nothing written yet there is nothing to read, so go straight to
      // the editor; an existing description opens as readable, linkified text.
      if (!item.description) {
        startEditing();
      }
    }
  };

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
      className="group rounded-xl transition-colors"
    >
      <div className="flex items-center gap-1 px-2 py-1">
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
        aria-label={item.checked ? t('todo.aria.uncheckItem') : t('todo.aria.checkItem')}
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

      {/* The title is the disclosure control — tapping it opens the description,
        * whether or not the item has one yet. */}
      <button
        type="button"
        onClick={handleToggleExpand}
        onPointerDown={(e) => e.stopPropagation()}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-sm font-medium break-words transition-colors bg-transparent border-0 p-0"
        style={{
          minHeight: 44,
          minWidth: 0,
          ...(item.checked
            ? { textDecoration: 'line-through', color: 'var(--color-ink-2)', opacity: 0.7 }
            : { color: 'var(--color-ink)' }),
        }}
      >
        <span className="min-w-0 break-words">{item.name}</span>
        {item.description && !isExpanded && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="shrink-0 text-muted"
            aria-label={t('todo.aria.hasDescription')}
          >
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        )}
      </button>

      {item.isRecurring && (
        <span className="chip tint-lav shrink-0" title={t('todo.recurringLabel')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          <span className="sr-only">{t('todo.recurringLabel')}</span>
        </span>
      )}

      <button
        onClick={() => onDelete(item.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3"
        style={{ width: 44, height: 44, minWidth: 44 }}
        aria-label={t('todo.aria.deleteItem')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      </div>

      {isExpanded && (
        <div id={panelId} className="px-2 pb-2" style={{ paddingLeft: 74 }}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                isDirtyRef.current = true;
                setDraft(e.target.value);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => {
                // Drop back to the rendered view so any URLs become clickable.
                commit();
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  // Abandon the edit; leave the stored description untouched.
                  isDirtyRef.current = false;
                  setDraft(item.description ?? '');
                  setIsEditing(false);
                  setIsExpanded(false);
                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  commit();
                  setIsEditing(false);
                  setIsExpanded(false);
                }
              }}
              rows={3}
              placeholder={t('todo.descriptionPlaceholder')}
              aria-label={t('todo.aria.description')}
              className="field text-sm"
              style={{
                resize: 'vertical',
                background: 'color-mix(in oklab, var(--color-mint) 5%, var(--color-paper))',
              }}
            />
          ) : (
            <div className="flex items-start gap-1.5">
              {/* Clicking the text edits it; clicking a link inside follows it
                * (the anchors stop propagation). */}
              <p
                onClick={startEditing}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 text-sm whitespace-pre-wrap break-words cursor-text m-0"
                style={{ color: item.description ? 'var(--color-ink-2)' : 'var(--color-muted)' }}
              >
                {item.description
                  ? linkify(item.description)
                  : t('todo.descriptionPlaceholder')}
              </p>
              <button
                type="button"
                onClick={startEditing}
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-ink"
                style={{ width: 32, height: 32, minWidth: 32 }}
                aria-label={t('todo.aria.editDescription')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
