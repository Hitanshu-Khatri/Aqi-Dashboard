
import React from 'react';
import { Card } from '@/components/ui/card';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-3 md:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-white/10 rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-white/10 rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-white/10 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Main AQI Skeleton */}
        <Card className="glass-card p-6 lg:p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-44 h-44 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-32 bg-white/10 rounded-full mx-auto animate-pulse" />
              <div className="h-4 w-48 bg-white/5 rounded mx-auto animate-pulse" />
            </div>
          </div>
        </Card>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-center">
                  <div className="w-28 h-28 bg-white/10 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-white/5 rounded mx-auto animate-pulse" />
              </div>
            </Card>
          ))}
        </div>

        {/* Chart and Map Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="glass-card p-6">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-80 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </Card>
          <Card className="glass-card p-6">
            <div className="space-y-4">
              <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
              <div className="h-80 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
