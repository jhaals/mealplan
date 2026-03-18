import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: `
        bg-white dark:bg-charcoal-800
        rounded-xl
        border border-cream-300/50 dark:border-charcoal-700
        shadow-soft
        backdrop-blur-sm
      `,
      elevated: `
        bg-white dark:bg-charcoal-800
        rounded-xl
        border border-cream-300/30 dark:border-charcoal-700/50
        shadow-medium
        relative
        before:absolute before:inset-0 before:rounded-xl
        before:bg-gradient-to-br before:from-white/40 before:to-transparent
        before:pointer-events-none
        dark:before:from-white/5
      `,
      subtle: `
        bg-cream-100/50 dark:bg-charcoal-800/50
        rounded-xl
        border border-cream-200 dark:border-charcoal-700/30
        shadow-none
      `,
      interactive: `
        bg-white dark:bg-charcoal-800
        rounded-xl
        border border-cream-300/50 dark:border-charcoal-700
        shadow-soft
        transition-all duration-300 ease-out
        hover:shadow-medium hover:-translate-y-0.5
        hover:border-primary-300 dark:hover:border-primary-700
        cursor-pointer
      `
    };

    return (
      <div
        ref={ref}
        className={`${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
