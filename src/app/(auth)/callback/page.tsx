'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { popPkce } from '@/lib/pkce';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state');
        return;
      }

      const pkce = popPkce();
      if (!pkce) {
        setError('PKCE data not found. Please try logging in again.');
        return;
      }

      if (pkce.state !== state) {
        setError('State mismatch. Possible CSRF attack.');
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/callback`;
        const data = await api.authPost<{
          access_token: string;
          user: { user_id: string; email: string; first_name: string; last_name: string };
        }>('/auth/oauth', {
          code,
          code_verifier: pkce.code_verifier,
          redirect_uri: redirectUri,
          provider: pkce.provider,
        });
        setAuth(data.access_token, data.user);
        router.push('/dashboard');
      } catch {
        setError('Authentication failed. Please try again.');
      }
    }

    handleCallback();
  }, [searchParams, setAuth, router]);

  if (error) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication failed</CardTitle>
          <CardDescription>{error}</CardDescription>
          <Link href="/login">
            <Button variant="outline" className="mt-4">Back to login</Button>
          </Link>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="text-center space-y-2">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <CardTitle className="text-xl">Signing you in...</CardTitle>
        <CardDescription>Please wait while we complete authentication</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}
