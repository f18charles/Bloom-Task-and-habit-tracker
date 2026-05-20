import { cn } from "../lib/utils.ts";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-slate-200 rounded-lg", className)} />
  );
}

export function TaskSkeleton() {
  return (
    <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bloom-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
