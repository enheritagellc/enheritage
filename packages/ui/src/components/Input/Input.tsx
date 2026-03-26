import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  elderlyMode?: boolean;
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, elderlyMode = false, className = '', id: externalId, ...rest }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined;

    const textSize = elderlyMode ? 'text-lg' : 'text-sm';
    const labelSize = elderlyMode ? 'text-base' : 'text-sm';
    const paddingSize = elderlyMode ? 'px-4 py-3' : 'px-3 py-2';

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={id}
          className={`font-medium text-[#344054] ${labelSize}`}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={[
            'w-full rounded-lg border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-[#F2F4F7] disabled:cursor-not-allowed',
            error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/30'
              : 'border-[#D0D5DD] focus:border-[#2B5BA8] focus:ring-[#2B5BA8]/30',
            textSize,
            paddingSize,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {error && (
          <p id={errorId} className="text-sm text-[#EF4444]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-sm text-[#667085]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
