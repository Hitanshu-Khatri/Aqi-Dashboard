
import React from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
  showGlow?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color,
  children,
  showGlow = false
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference - (progress * circumference);

  // Extract color from Tailwind class for glow effect
  const getGlowColor = (colorClass: string) => {
    const colorMap: { [key: string]: string } = {
      'text-green-400': '34, 197, 94',
      'text-yellow-400': '250, 204, 21',
      'text-orange-400': '251, 146, 60',
      'text-red-400': '248, 113, 113',
      'text-purple-400': '196, 181, 253',
      'text-blue-400': '96, 165, 250',
    };
    return colorMap[colorClass] || '96, 165, 250';
  };

  const glowColor = getGlowColor(color);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{
          filter: showGlow 
            ? `drop-shadow(0 0 8px rgba(${glowColor}, 0.2)) drop-shadow(0 0 16px rgba(${glowColor}, 0.1))`
            : 'none',
            overflow: 'visible',
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/10 dark:text-white/10 light:text-gray-300"
          style={{
            stroke: 'var(--circle-bg, rgba(255, 255, 255, 0.1))'
          }}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
          style={{
            filter: showGlow ? `drop-shadow(0 0 4px rgba(${glowColor}, 0.4))` : 'none',
          }}
        />
        {/* Inner glow circle */}
        {showGlow && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth / 2}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${color} opacity-20 transition-all duration-1000 ease-out`}
            style={{
              filter: 'blur(0.5px)',
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};
