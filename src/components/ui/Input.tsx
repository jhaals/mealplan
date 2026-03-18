import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
  };

  return (
    <div className="w-full relative">
      <div className="relative">
        <input
          className={`
            w-full px-4 py-3 text-base
            rounded-xl
            bg-white dark:bg-charcoal-800
            border-2 transition-all duration-200
            text-charcoal-800 dark:text-cream-100
            min-h-[44px]
            placeholder-transparent
            shadow-inner-sm
            ${error
              ? 'border-red-400 dark:border-red-500'
              : isFocused
                ? 'border-primary-500 shadow-glow ring-4 ring-primary-500/10'
                : 'border-cream-300 dark:border-charcoal-600 hover:border-sage-300 dark:hover:border-charcoal-500'
            }
            ${className}
          `}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {label && (
          <label
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              font-medium
              ${isFocused || hasValue || props.value
                ? 'top-1 text-xs text-primary-600 dark:text-primary-400'
                : 'top-3.5 text-base text-charcoal-500 dark:text-cream-400'
              }
              ${error ? 'text-red-500' : ''}
            `}
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
