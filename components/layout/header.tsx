'use client';

import { useAuth } from '@/lib/auth/auth-context';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user } = useAuth();

  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">
            {user?.email}
          </div>
        </div>
      </div>
    </div>
  );
}
