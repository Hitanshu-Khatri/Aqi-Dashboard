
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  time: string;
  aqi: number;
}

interface AQIChartProps {
  data: ChartData[];
}

export const AQIChart: React.FC<AQIChartProps> = ({ data }) => {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#a855f7';
    return '#dc2626';
  };

  // Theme-aware colors
  const gridColor = isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)';
  const axisColor = isLightMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)';
  const tooltipBg = isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.8)';
  const tooltipBorder = isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
  const tooltipTextColor = isLightMode ? '#000' : '#fff';

  return (
    <div className="w-full h-full">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="animate-pulse text-2xl sm:text-3xl">📊</div>
            <div className="text-xs sm:text-sm">Collecting data...</div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ 
              top: 5, 
              right: window.innerWidth < 640 ? 10 : 30, 
              left: window.innerWidth < 640 ? 0 : 20, 
              bottom: 5 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="time" 
              stroke={axisColor}
              fontSize={window.innerWidth < 640 ? 10 : 12}
              angle={window.innerWidth < 640 ? -45 : 0}
              textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
              height={window.innerWidth < 640 ? 60 : 30}
            />
            <YAxis 
              stroke={axisColor}
              fontSize={window.innerWidth < 640 ? 10 : 12}
              width={window.innerWidth < 640 ? 35 : 60}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                fontSize: window.innerWidth < 640 ? '12px' : '14px'
              }}
              labelStyle={{ color: tooltipTextColor }}
            />
            <Line 
              type="monotone" 
              dataKey="aqi" 
              stroke="#60a5fa"
              strokeWidth={window.innerWidth < 640 ? 2 : 3}
              dot={{ fill: '#60a5fa', strokeWidth: 2, r: window.innerWidth < 640 ? 3 : 4 }}
              activeDot={{ r: window.innerWidth < 640 ? 5 : 6, stroke: '#60a5fa', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
