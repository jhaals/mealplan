import React from 'react';

type Variant = 'default' | 'elevated' | 'subtle' | 'interactive';
type Tint = 'pear' | 'cyan' | 'coral' | 'mint' | 'lav';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: Variant;
  /** Accent tint at 6%, deepening to 12% on hover when interactive. */
  tint?: Tint;
}

/* Card physics for this build: soft layered shadow, 20px radius, spring lift.
 * The chunky hard-edge physics belongs to buttons and today's marker, so the
 * two read as different materials. See design.md. */
const VARIANT_CLASS: Record<Variant, string> = {
  default: 'card',
  elevated: 'card',
  subtle: 'card',
  interactive: 'card card--interactive',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', variant = 'default', tint, ...props }, ref) => {
    const classes = [
      VARIANT_CLASS[variant],
      tint ? `card--tint tint-${tint}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const style =
      variant === 'subtle'
        ? { boxShadow: 'none', background: 'var(--color-paper-2)', ...props.style }
        : variant === 'elevated'
          ? { boxShadow: 'var(--shadow-lift)', ...props.style }
          : props.style;

    return (
      <div ref={ref} className={classes} {...props} style={style}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
