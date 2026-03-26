import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  const hasHeader = title || subtitle || actions;

  return (
    <div
      className={[
        'bg-white rounded-lg shadow-sm border border-[#E4E7EC]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E4E7EC]">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h3 className="text-base font-semibold text-[#101828]">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-[#667085]">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">{actions}</div>
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
};
