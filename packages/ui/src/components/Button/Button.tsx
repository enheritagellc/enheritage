import React from 'react';
import { Spinner } from '../Spinner/Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  elderlyMode?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#2B5BA8] text-white border border-[#2B5BA8] hover:bg-[#1B3A6B] hover:border-[#1B3A6B] focus:ring-[#2B5BA8]',
  secondary:
    'bg-white text-[#2B5BA8] border border-[#2B5BA8] hover:bg-[#E8EEF7] focus:ring-[#2B5BA8]',
  ghost:
    'bg-transparent text-[#344054] border border-transparent hover:bg-[#F2F4F7] focus:ring-[#667085]',
  danger:
    'bg-[#EF4444] text-white border border-[#EF4444] hover:bg-[#991B1B] hover:border-[#991B1B] focus:ring-[#EF4444]',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-base rounded-lg gap-2',
  lg: 'px-6 py-3 text-lg rounded-lg gap-2',
};

const elderlyModeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-base rounded-md gap-2',
  md: 'px-6 py-3 text-lg rounded-lg gap-2',
  lg: 'px-8 py-4 text-xl rounded-lg gap-3',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      elderlyMode = false,
      children,
      className = '',
      disabled,
      ...rest
    },
    ref,
  ) => {
    const sizeClass = elderlyMode ? elderlyModeClasses[size] : sizeClasses[size];
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={[
          'inline-flex items-center justify-center font-medium transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {isLoading && (
          <Spinner
            size="sm"
            color="currentColor"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
