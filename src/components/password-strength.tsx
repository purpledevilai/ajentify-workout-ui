'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function getStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return { score, label: labels[Math.min(score, labels.length - 1)] ?? 'Very Weak' };
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = getStrength(password);
  const percent = (score / 5) * 100;

  return (
    <div className="space-y-1.5">
      <Progress value={percent} className={cn(
        'h-1.5',
        score <= 1 && '[&>[data-slot=indicator]]:bg-destructive',
        score === 2 && '[&>[data-slot=indicator]]:bg-orange-500',
        score === 3 && '[&>[data-slot=indicator]]:bg-yellow-500',
        score >= 4 && '[&>[data-slot=indicator]]:bg-green-500',
      )} />
      <p className={cn(
        'text-xs',
        score <= 1 && 'text-destructive',
        score === 2 && 'text-orange-500',
        score === 3 && 'text-yellow-500',
        score >= 4 && 'text-green-500',
      )}>
        {label}
      </p>
    </div>
  );
}
