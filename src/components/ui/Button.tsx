import React, { useCallback, useRef, useState } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Suppress the coral star-burst on a completed primary action. */
  noBurst?: boolean;
}

/* The .btn system lives in globals.css and is copied verbatim from Hum's
 * reviewed spec — the press is the feedback. Do not re-improvise button CSS
 * here; add a modifier there instead. */
const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn',
  secondary: 'btn btn--soft',
  danger: 'btn btn--coral',
  ghost: 'btn btn--soft',
  outline: 'btn btn--outline',
};

const SIZE_CLASS = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

interface Burst {
  id: number;
  x: number;
  y: number;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  noBurst = false,
  className = '',
  onClick,
  disabled,
  ...props
}: ButtonProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  // Signature move #7 — a single coral star-burst from the click point on a
  // completed primary action. Never auto-loops; disabled under reduced motion
  // by the stylesheet.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === 'primary' && !noBurst && !loading) {
        const rect = event.currentTarget.getBoundingClientRect();
        const id = nextId.current++;
        const burst = {
          id,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        setBursts((current) => [...current, burst]);
        window.setTimeout(() => {
          setBursts((current) => current.filter((b) => b.id !== id));
        }, 420);
      }
      onClick?.(event);
    },
    [variant, noBurst, loading, onClick]
  );

  const classes = [
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{children}</span>
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="star-burst"
          style={{ left: burst.x - 12, top: burst.y - 12 }}
        />
      ))}
    </button>
  );
}
