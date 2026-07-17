interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
}

/* A segmented control, not an underlined tab strip.
 *
 * Deliberately toggle buttons with aria-pressed rather than role="tablist" +
 * role="tab". The full tab pattern owes the user roving-tabindex arrow-key
 * navigation and a linked tabpanel; announcing "tab" without honouring those
 * is worse for a screen reader than not claiming the role at all. These are
 * view switchers, and a pressed toggle describes them honestly. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex p-1 rounded-full max-w-full overflow-x-auto custom-scrollbar"
      style={{ background: 'var(--color-paper-2)' }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className="px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap shrink-0 transition-colors"
            style={
              isActive
                ? {
                    background: 'var(--color-paper)',
                    color: 'var(--color-ink)',
                    boxShadow: 'var(--shadow-card)',
                  }
                : { color: 'var(--color-ink-2)' }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
