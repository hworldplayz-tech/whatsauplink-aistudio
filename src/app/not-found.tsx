import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black text-primary">404</h1>
      <h2 className="text-2xl font-bold mt-2">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        The WhatsApp group link or page you are looking for does not exist or has been moved.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link href="/">
          <Home className="h-4 w-4" />
          Back to Homepage
        </Link>
      </Button>
    </div>
  );
}
