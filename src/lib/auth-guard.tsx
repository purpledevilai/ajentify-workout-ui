'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, bootstrapAuth } from './auth-store';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!bootstrapped) {
      bootstrapAuth().then((ok) => {
        if (!ok) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });
    }
  }, [bootstrapped, router, pathname]);

  useEffect(() => {
    if (bootstrapped && !accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [bootstrapped, accessToken, router, pathname]);

  if (isLoading || !bootstrapped) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!accessToken) return null;

  return <>{children}</>;
}
