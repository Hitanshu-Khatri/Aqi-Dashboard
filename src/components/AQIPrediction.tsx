import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface HistoricalData {
  date: string;
  aqi: number;
  temperature: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
}

interface AQIPredictionProps {
  realHistoricalData: HistoricalData[];
  currentAqi: number;
}

interface ChartRow {
  label: string;
  actual: number | null;
  predicted: number | null;
}

function predictAtMinutes(history: HistoricalData[], minutesAhead: number): number {
  // Fallback formula used when backend is unreachable
  if (history.length === 0) return 0;
  const recent = history.slice(-12);
  const avgAqi = recent.reduce((sum, row) => sum + row.aqi, 0) / recent.length;
  const latest = recent[recent.length - 1].aqi;
  const trend = recent.length > 1
    ? (recent[recent.length - 1].aqi - recent[0].aqi) / (recent.length - 1)
    : 0;
  const t = minutesAhead / 180;
  const decay = Math.exp(-1.5 * t);
  const forecast = decay * latest + (1 - decay) * avgAqi + trend * (minutesAhead / 60) * 0.25;
  return Math.max(10, Math.min(400, Math.round(forecast)));
}

async function fetchMLPrediction(
  history: HistoricalData[],
  minutesAhead: number
): Promise<number> {
  if (history.length === 0) return 0;
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const recentAqi = sorted.slice(-12).map((r) => r.aqi);
  const now = new Date();

  const res = await fetch('http://localhost:5000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aqi:          latest.aqi,
      temperature:  latest.temperature,
      humidity:     latest.humidity,
      pm2_5:        latest.pm2_5,
      pm10:         latest.pm10,
      recentAqi,
      minutesAhead,
      hour: now.getHours(),
      dow:  now.getDay(),
    }),
  });
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return Math.round(data.prediction);
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function aqiLevel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiColor(aqi: number): string {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#f59e0b';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#7c3aed';
}

export const AQIPrediction: React.FC<AQIPredictionProps> = ({ realHistoricalData, currentAqi }) => {
  const [sliderMinutes, setSliderMinutes] = useState(60);
  const [forecastAtSlider, setForecastAtSlider] = useState<number>(currentAqi);
  const [chartForecasts, setChartForecasts] = useState<Record<number, number>>({});
  const [loadingSlider, setLoadingSlider] = useState(false);
  const [usingML, setUsingML] = useState(false);

  // Fetch ML prediction for the slider value
  const fetchSlider = useCallback(async (minutes: number) => {
    if (realHistoricalData.length === 0) return;
    setLoadingSlider(true);
    try {
      const pred = await fetchMLPrediction(realHistoricalData, minutes);
      setForecastAtSlider(pred);
      setUsingML(true);
    } catch {
      // Backend unreachable — fallback to formula
      const sorted = [...realHistoricalData].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setForecastAtSlider(predictAtMinutes(sorted, minutes));
      setUsingML(false);
    } finally {
      setLoadingSlider(false);
    }
  }, [realHistoricalData]);

  // Fetch ML predictions for chart points (30,60,90,120,150,180)
  const fetchChart = useCallback(async () => {
    if (realHistoricalData.length === 0) return;
    const sorted = [...realHistoricalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const results: Record<number, number> = {};
    for (const m of [30, 60, 90, 120, 150, 180]) {
      try {
        results[m] = await fetchMLPrediction(sorted, m);
      } catch {
        results[m] = predictAtMinutes(sorted, m);
      }
    }
    setChartForecasts(results);
  }, [realHistoricalData]);

  // On data change: fetch chart forecasts
  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // On slider change: debounced fetch
  useEffect(() => {
    const t = setTimeout(() => fetchSlider(sliderMinutes), 300);
    return () => clearTimeout(t);
  }, [sliderMinutes, fetchSlider]);

  const { chartRows } = useMemo(() => {
    if (realHistoricalData.length === 0) return { chartRows: [] as ChartRow[] };

    const sorted = [...realHistoricalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recentActual = sorted.slice(-12);

    const actualRows: ChartRow[] = recentActual.map((row) => ({
      label: new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actual: row.aqi,
      predicted: null,
    }));

    const lastActual = recentActual[recentActual.length - 1];
    const lastLabel = new Date(lastActual.date).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    });

    const forecastPoints: ChartRow[] = [
      { label: lastLabel, actual: lastActual.aqi, predicted: lastActual.aqi },
    ];
    for (const m of [30, 60, 90, 120, 150, 180]) {
      forecastPoints.push({
        label: `+${formatMinutes(m)}`,
        actual: null,
        predicted: chartForecasts[m] ?? null,
      });
    }

    return { chartRows: [...actualRows, ...forecastPoints] };
  }, [realHistoricalData, chartForecasts]);

  const delta = forecastAtSlider - currentAqi;

  if (realHistoricalData.length === 0) {
    return (
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-2">AQI Prediction</h3>
        <p className="text-sm text-muted-foreground">
          Waiting for real drone data. Start the drone stream and this page will show the forecast automatically.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card p-5">
          <div className="text-sm text-muted-foreground">Current AQI</div>
          <div className="text-4xl font-bold mt-1" style={{ color: aqiColor(currentAqi) }}>
            {currentAqi}
          </div>
          <div className="text-sm mt-1 text-muted-foreground">{aqiLevel(currentAqi)}</div>
        </Card>

        <Card className="glass-card p-5">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Predicted AQI in{' '}
            <span className="font-semibold text-foreground">{formatMinutes(sliderMinutes)}</span>
            {usingML && (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ML Model</span>
            )}
          </div>
          <div className="text-4xl font-bold mt-1" style={{ color: aqiColor(forecastAtSlider) }}>
            {loadingSlider ? '...' : forecastAtSlider}
          </div>
          <div className="text-sm mt-1 text-muted-foreground">
            {aqiLevel(forecastAtSlider)}{' '}
            <span className={delta >= 0 ? 'text-red-400' : 'text-green-400'}>
              ({delta >= 0 ? '+' : ''}{delta})
            </span>
          </div>
        </Card>
      </div>

      {/* Slider */}
      <Card className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Predict after:</span>
          <span className="text-sm font-semibold text-primary">{formatMinutes(sliderMinutes)}</span>
        </div>
        <Slider
          min={5}
          max={180}
          step={5}
          value={[sliderMinutes]}
          onValueChange={(val) => setSliderMinutes(val[0])}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>5 min</span>
          <span>1h</span>
          <span>2h</span>
          <span>3h</span>
        </div>
      </Card>

      {/* Chart */}
      <Card className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">AQI Trend &amp; 3-Hour Forecast</h3>
          <span className="text-xs text-muted-foreground">Blue = actual · Orange = forecast</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                name="Actual AQI"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 4 }}
                strokeDasharray="6 4"
                connectNulls={false}
                name="Forecast AQI"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
