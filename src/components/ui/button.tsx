'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'buy' | 'sell' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-black font-medium hover:bg-accent-hover hover:[box-shadow:var(--shadow-glow-accent)]',
  secondary: 'bg-bg-tertiary text-text-primary hover:bg-bg-hover',
  buy: 'bg-buy text-black font-medium hover:brightness-110 hover:[box-shadow:var(--shadow-glow-buy)]',
  sell: 'bg-sell text-white font-medium hover:brightness-110 hover:[box-shadow:var(--shadow-glow-sell)]',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 h-7 text-xs',
  md: 'px-4 h-9 text-[13px]',
  lg: 'px-6 h-11 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'rounded-sm cursor-pointer inline-flex items-center justify-center gap-2',
          'transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'press focus-ring',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
