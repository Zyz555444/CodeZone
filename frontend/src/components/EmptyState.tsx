'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/Button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="text-copy-14 font-medium text-neutral-9 mb-1">{title}</p>
      {description && (
        <p className="text-copy-13 text-neutral-7 mb-6 max-w-xs">{description}</p>
      )}
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {actionLabel}
            </Button>
          </Link>
        ) : onAction ? (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        ) : null
      )}
    </div>
  );
}
