
import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: keyof typeof Icons;
  color: string;
  isLoading: boolean;
  isOffline?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  isLoading,
  isOffline = false
}) => {
  const IconComponent = Icons[icon] as LucideIcon;
  
  const getMaxValue = (title: string) => {
    switch (title) {
      case 'Temperature': return 50;
      case 'Humidity': return 100;
      case 'PM2.5': return 100;
      case 'PM10': return 150;
      default: return 100;
    }
  };

  const getTooltipText = (title: string) => {
    switch (title) {
      case 'Temperature':
        return 'Ambient air temperature in degrees Celsius. Affects air quality and comfort levels.';
      case 'Humidity':
        return 'Relative humidity as a percentage. High humidity can worsen air pollution effects.';
      case 'PM2.5':
        return 'Fine particulate matter smaller than 2.5 micrometers. Can penetrate deep into lungs and cause serious health issues.';
      case 'PM10':
        return 'Coarse particulate matter smaller than 10 micrometers. Can cause respiratory issues and aggravate asthma.';
      default:
        return 'Air quality measurement';
    }
  };

  const getHealthStatus = (title: string, value: number) => {
    switch (title) {
      case 'PM2.5':
        if (value <= 12) return { status: 'Good', color: 'text-green-400' };
        if (value <= 35) return { status: 'Moderate', color: 'text-yellow-400' };
        if (value <= 55) return { status: 'Unhealthy for Sensitive', color: 'text-orange-400' };
        return { status: 'Unhealthy', color: 'text-red-400' };
      case 'PM10':
        if (value <= 54) return { status: 'Good', color: 'text-green-400' };
        if (value <= 154) return { status: 'Moderate', color: 'text-yellow-400' };
        return { status: 'Unhealthy', color: 'text-red-400' };
      case 'Humidity':
        if (value >= 30 && value <= 60) return { status: 'Optimal', color: 'text-green-400' };
        if (value < 30) return { status: 'Low', color: 'text-yellow-400' };
        return { status: 'High', color: 'text-orange-400' };
      default:
        return { status: 'Normal', color: 'text-gray-400' };
    }
  };

  const maxValue = getMaxValue(title);
  const healthStatus = getHealthStatus(title, value);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`glass-card p-3 sm:p-4 md:p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:shadow-xl group cursor-pointer ${isOffline ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex flex-col items-center space-y-2 sm:space-y-3 md:space-y-4">
              {/* Header with icon and title */}
              <div className="flex items-center gap-2 sm:gap-3 w-full justify-center">
                <div className={`p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 ${color} group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
                  <p className={`text-xs font-medium ${healthStatus.color}`}>
                    {healthStatus.status}
                  </p>
                </div>
              </div>

              {/* Circular progress with glow */}
              <div className="relative group-hover:scale-105 transition-transform duration-300">
                <CircularProgress
                  value={isLoading ? 0 : value}
                  max={maxValue}
                  size={window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 90 : 100}
                  strokeWidth={window.innerWidth < 640 ? 5 : 6}
                  color={color}
                  showGlow={!isLoading && !isOffline}
                >
                  <div className="text-center">
                    <div className={`text-base sm:text-lg md:text-xl font-bold ${color} ${isLoading ? 'animate-pulse' : ''} transition-all duration-500`}>
                      {isLoading ? '--' : value}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{unit}</div>
                  </div>
                </CircularProgress>
              </div>

              {/* Mini trend indicator */}
              <div className="w-full">
                <div className="flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
                  <span>0</span>
                  <div className="flex-1 mx-1 sm:mx-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                  <span>{maxValue}</span>
                </div>
              </div>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{getTooltipText(title)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
