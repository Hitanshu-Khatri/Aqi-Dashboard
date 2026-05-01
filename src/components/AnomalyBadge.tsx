import React, { useMemo } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';

interface Reading {
  aqi: number;
  pm2_5: number;
  pm10: number;
}

interface AnomalyBadgeProps {
  history: { aqi: number; pm2_5: number; pm10: number }[];
  current: Reading;
}

interface AnomalyResult {
  detected: boolean;
  metric: string | null;
  zScore: number;
  deviation: number;
  baseline: number;
}

const ZSCORE_THRESHOLD = 2.5;
const MIN_SAMPLES = 6;

function computeAnomaly(
  history: { aqi: number; pm2_5: number; pm10: number }[],
  current: Reading,
): AnomalyResult {
  if (history.length < MIN_SAMPLES) {
    return { detected: false, metric: null, zScore: 0, deviation: 0, baseline: 0 };
  }
  const window = history.slice(-30);

  const metrics: Array<keyof Reading> = ['aqi', 'pm2_5', 'pm10'];
  let worst: AnomalyResult = { detected: false, metric: null, zScore: 0, deviation: 0, baseline: 0 };

  for (const key of metrics) {
    const values = window.map((r) => r[key]).filter((v) => Number.isFinite(v));
    if (values.length < MIN_SAMPLES) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    const std = Math.sqrt(variance);
    if (std < 0.5) continue;
    const z = Math.abs(current[key] - mean) / std;
    if (z > worst.zScore) {
      worst = {
        detected: z >= ZSCORE_THRESHOLD,
        metric: key,
        zScore: z,
        deviation: current[key] - mean,
        baseline: mean,
      };
    }
  }
  return worst;
}

const METRIC_LABELS: Record<string, string> = {
  aqi: 'AQI',
  pm2_5: 'PM2.5',
  pm10: 'PM10',
};

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({ history, current }) => {
  const anomaly = useMemo(() => computeAnomaly(history, current), [history, current]);

  if (!anomaly.detected) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                   bg-green-500/10 border border-green-400/25 text-green-300 text-[11px] font-medium"
        title="Readings are within the recent baseline"
      >
        <Activity className="h-3 w-3" />
        <span>Normal</span>
      </div>
    );
  }

  const direction = anomaly.deviation > 0 ? '↑' : '↓';
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                 bg-red-500/15 border border-red-400/40 text-red-300 text-[11px] font-semibold
                 animate-pulse shadow-lg shadow-red-500/20"
      title={`${METRIC_LABELS[anomaly.metric ?? 'aqi']} deviates ${anomaly.zScore.toFixed(1)}σ from baseline ${anomaly.baseline.toFixed(0)}`}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-3 w-3" />
      <span>
        Anomaly: {METRIC_LABELS[anomaly.metric ?? 'aqi']} {direction}{' '}
        {anomaly.zScore.toFixed(1)}σ
      </span>
    </div>
  );
};
