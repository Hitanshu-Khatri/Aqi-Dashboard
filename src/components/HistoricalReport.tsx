
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { AQIChart } from './AQIChart';

interface HistoricalData {
  date: string;
  aqi: number;
  temperature: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
}

export const HistoricalReport: React.FC<{ historicalData: HistoricalData[] }> = ({ historicalData }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  // Filter out invalid dates
  const validHistoricalData = historicalData.filter(item => isValid(new Date(item.date)));

  // Use the filtered historicalData
  const chartData = validHistoricalData.slice(-7).map(item => ({
    time: format(new Date(item.date), 'MMM dd'),
    aqi: item.aqi
  }));

  const getMetricTrend = (metric: 'aqi' | 'temperature' | 'humidity' | 'pm2_5' | 'pm10') => {
    const recent = historicalData.slice(-3);
    const older = historicalData.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, item) => sum + item[metric], 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item[metric], 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    const percentage = Math.abs((diff / olderAvg) * 100);
    
    return {
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      percentage: percentage.toFixed(1)
    };
  };

  const MetricSummary = ({ title, current, trend }: { title: string; current: number; trend: ReturnType<typeof getMetricTrend> }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-semibold">{current}</p>
      </div>
      <div className="flex items-center gap-1 text-sm">
        {trend.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-400" />}
        {trend.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-400" />}
        {trend.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
        <span className={trend.trend === 'up' ? 'text-red-400' : trend.trend === 'down' ? 'text-green-400' : 'text-gray-400'}>
          {trend.percentage}%
        </span>
      </div>
    </div>
  );

  const latestData = historicalData[historicalData.length - 1];

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="flex gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="glass-button">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Metrics Summary */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">7-Day Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricSummary title="AQI" current={latestData.aqi} trend={getMetricTrend('aqi')} />
          <MetricSummary title="Temperature (°C)" current={latestData.temperature} trend={getMetricTrend('temperature')} />
          <MetricSummary title="Humidity (%)" current={latestData.humidity} trend={getMetricTrend('humidity')} />
          <MetricSummary title="PM2.5 (μg/m³)" current={latestData.pm2_5} trend={getMetricTrend('pm2_5')} />
          <MetricSummary title="PM10 (μg/m³)" current={latestData.pm10} trend={getMetricTrend('pm10')} />
        </div>
      </Card>

      {/* Historical Chart */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">AQI History (Last 7 Days)</h3>
        <div className="h-80">
          <AQIChart data={chartData} />
        </div>
      </Card>

      {/* Analytics Summary */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">Analytics Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Best Air Quality Day</h4>
            <p className="text-muted-foreground">
              {format(new Date(historicalData.reduce((min, item) => item.aqi < min.aqi ? item : min).date), 'PPP')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Average AQI (30 days)</h4>
            <p className="text-muted-foreground">
              {Math.round(historicalData.reduce((sum, item) => sum + item.aqi, 0) / historicalData.length)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
