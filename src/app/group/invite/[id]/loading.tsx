import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function GroupDetailLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background/50">
      {/* Breadcrumb Skeleton */}
      <div className="border-b bg-card">
        <div className="container py-3">
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>

      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader className="p-0">
                  {/* Banner Skeleton */}
                  <Skeleton className="h-64 sm:h-80 w-full rounded-none" />
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Badges */}
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                  {/* Title & Desc Skeleton */}
                  <Skeleton className="h-8 w-3/4 rounded-md mt-2" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3 p-6 pt-0">
                  <Skeleton className="h-14 flex-1 rounded-xl" />
                  <Skeleton className="h-14 w-36 rounded-xl" />
                  <Skeleton className="h-14 w-36 rounded-xl" />
                </CardFooter>
              </Card>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-5 flex flex-col items-center">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-40 w-40 rounded-xl" />
                <Skeleton className="h-3 w-48 mt-3" />
              </Card>
              <Card className="p-4 space-y-3">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
