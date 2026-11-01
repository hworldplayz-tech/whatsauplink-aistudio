'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-6">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground text-sm sm:text-base">
        We encountered a temporary server error. You can try reloading or returning to the homepage.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Back to Homepage
          </Link>
        </Button>
      </div>
    </div>
  );
}
