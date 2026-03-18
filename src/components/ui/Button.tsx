import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    font-medium rounded-xl
    transition-all duration-200 ease-out
    focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    relative overflow-hidden
  `;

  const variants = {
    primary: `
      bg-gradient-to-br from-primary-500 to-primary-600
      text-white font-semibold
      shadow-soft
      hover:shadow-medium hover:from-primary-600 hover:to-primary-700
      focus:ring-4 focus:ring-primary-500/30
      active:shadow-soft
      before:absolute before:inset-0
      before:bg-gradient-to-br before:from-white/20 before:to-transparent
      before:opacity-0 hover:before:opacity-100
      before:transition-opacity before:duration-300
    `,
    secondary: `
      bg-cream-200 dark:bg-charcoal-700
      text-charcoal-800 dark:text-cream-100
      border border-cream-300 dark:border-charcoal-600
      shadow-soft
      hover:bg-cream-300 dark:hover:bg-charcoal-600
      hover:border-sage-300 dark:hover:border-charcoal-500
      focus:ring-4 focus:ring-sage-300/30
    `,
    danger: `
      bg-gradient-to-br from-red-500 to-red-600
      text-white font-semibold
      shadow-soft
      hover:shadow-medium hover:from-red-600 hover:to-red-700
      focus:ring-4 focus:ring-red-500/30
      active:shadow-soft
    `,
    ghost: `
      bg-transparent
      text-charcoal-700 dark:text-cream-200
      hover:bg-cream-200/50 dark:hover:bg-charcoal-700/50
      focus:ring-4 focus:ring-sage-300/20
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-3 text-base min-h-[44px]', // Mobile-friendly 44px
    lg: 'px-7 py-4 text-lg min-h-[52px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
