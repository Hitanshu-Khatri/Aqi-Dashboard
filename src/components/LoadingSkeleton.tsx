
import React from 'react';
import { Card } from '@/components/ui/card';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 sm:h-8 w-48 sm:w-64 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-3 sm:h-4 w-36 sm:w-48 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 rounded-md animate-pulse" />
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 rounded-md animate-pulse" />
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Main AQI Skeleton */}
        <Card className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="text-center space-y-4 md:space-y-6">
            <div className="flex justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-6 sm:h-8 w-24 sm:w-32 bg-white/10 rounded-full mx-auto animate-pulse" />
              <div className="h-3 sm:h-4 w-36 sm:w-48 bg-white/5 rounded mx-auto animate-pulse" />
            </div>
          </div>
        </Card>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-card p-3 sm:p-4 md:p-6">
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3 justify-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-3 sm:h-4 w-12 sm:w-16 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white/10 rounded-full animate-pulse" />
                </div>
                <div className="h-3 sm:h-4 w-16 sm:w-20 bg-white/5 rounded mx-auto animate-pulse" />
              </div>
            </Card>
          ))}
        </div>

        {/* Chart and Map Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <Card className="glass-card p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="h-5 sm:h-6 w-24 sm:w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-64 sm:h-80 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </Card>
          <Card className="glass-card p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="h-5 sm:h-6 w-32 sm:w-40 bg-white/10 rounded animate-pulse" />
              <div className="h-64 sm:h-80 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
