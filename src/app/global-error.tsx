'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="mt-2 text-gray-500 text-sm">A temporary server error occurred.</p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
