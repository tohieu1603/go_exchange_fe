'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, wrapperClassName = '', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={`flex flex-col gap-0.5 ${wrapperClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-[11px] text-text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full h-8 bg-bg-tertiary border border-border px-2 text-xs text-text-primary font-mono',
              'placeholder:text-text-muted',
              'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30',
              'transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus-ring',
              suffix ? 'pr-12' : '',
              error ? 'border-sell ring-1 ring-sell' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {suffix && (
            <span className="absolute right-2 text-[11px] text-text-muted pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-sell">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
