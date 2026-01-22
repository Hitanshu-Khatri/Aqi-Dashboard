
import React from 'react';

interface AQIBadgeProps {
  level: string;
  color: string;
}

export const AQIBadge: React.FC<AQIBadgeProps> = ({ level, color }) => {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'Good':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'Moderate':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'Unhealthy for Sensitive Groups':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'Unhealthy':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'Very Unhealthy':
        return 'bg-purple-500/20 border-purple-500/30 text-purple-400';
      case 'Hazardous':
        return 'bg-red-600/20 border-red-600/30 text-red-600';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border backdrop-blur-sm font-medium text-sm ${getBadgeStyle(level)}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${color.replace('text-', 'bg-')}`} />
      {level}
    </div>
  );
};
