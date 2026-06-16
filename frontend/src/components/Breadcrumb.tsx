'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-1.5 text-sm ${className}`} aria-label="面包屑导航">
      <Link
        href="/dashboard"
        className="text-neutral-6 hover:text-accent transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-neutral-5" />
            {isLast || !item.href ? (
              <span className="text-neutral-9 font-medium">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-neutral-6 hover:text-accent transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
