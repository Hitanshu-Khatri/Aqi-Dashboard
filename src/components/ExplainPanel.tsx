import React from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';

export interface FeatureContribution {
  feature: string;
  importance: number;
  value: number;
  baseline: number;
  deviation: number;
  contribution: number;
}

interface ExplainPanelProps {
  topFeatures?: FeatureContribution[];
  confidence?: number;
  prediction: number;
  currentAqi: number;
  usingML: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  aqi: 'Current AQI',
  temperature: 'Temperature',
  humidity: 'Humidity',
  pm2_5: 'PM2.5 particles',
  pm10: 'PM10 particles',
  aqi_roll3: 'AQI (3-step avg)',
  aqi_roll6: 'AQI (6-step avg)',
  aqi_roll12: 'AQI (12-step avg)',
  aqi_trend: 'AQI trend',
  aqi_lag1: 'AQI (1 step ago)',
  aqi_lag3: 'AQI (3 steps ago)',
  aqi_lag6: 'AQI (6 steps ago)',
  pm2_5_roll3: 'PM2.5 trend',
  pm10_roll3: 'PM10 trend',
  temperature_roll3: 'Temperature trend',
  humidity_roll3: 'Humidity trend',
  hour_sin: 'Time of day',
  hour_cos: 'Time of day',
  dow_sin: 'Day of week',
  dow_cos: 'Day of week',
  minutes_ahead: 'Forecast horizon',
};

function humanize(name: string): string {
  return FEATURE_LABELS[name] ?? name.replace(/_/g, ' ');
}

function formatDeviation(contribution: number, deviation: number): string {
  if (Math.abs(deviation) < 0.2) return 'near baseline';
  const direction = contribution >= 0 ? 'above' : 'below';
  const magnitude =
    Math.abs(deviation) < 0.8 ? 'slightly' : Math.abs(deviation) < 1.8 ? 'notably' : 'strongly';
  return `${magnitude} ${direction} normal`;
}

export const ExplainPanel: React.FC<ExplainPanelProps> = ({
  topFeatures,
  confidence,
  prediction,
  currentAqi,
  usingML,
}) => {
  const delta = prediction - currentAqi;
  const direction = delta >= 0 ? 'rise' : 'fall';
  const directionIcon = delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;

  const meaningful = (topFeatures ?? [])
    .filter((f) => Math.abs(f.contribution) > 0.00001 || f.importance > 0.001)
    .slice(0, 4);

  if (!usingML || meaningful.length === 0) {
    return (
      <Card className="glass-card p-4 sm:p-5 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 border border-amber-400/25 text-amber-300 flex-shrink-0">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Why this forecast?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {usingML
                ? 'Feature contributions unavailable for this prediction.'
                : 'Running in fallback mode — explainability requires the ML backend.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const maxContribution = Math.max(
    ...meaningful.map((f) => Math.abs(f.contribution)),
    0.0001,
  );

  return (
    <Card className="glass-card p-4 sm:p-5 border border-white/10">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 border border-amber-400/25 text-amber-300 flex-shrink-0">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Why this forecast?</h3>
            {confidence != null && (
              <span className="text-[10px] uppercase tracking-wide bg-green-500/15 text-green-300 border border-green-400/25 px-1.5 py-0.5 rounded-full">
                Confidence {confidence.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            {directionIcon}
            Model predicts AQI will {direction} by{' '}
            <span className="font-semibold text-foreground/90">
              {Math.abs(Math.round(delta))}
            </span>{' '}
            points, driven by:
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {meaningful.map((feature) => {
          const pct = (Math.abs(feature.contribution) / maxContribution) * 100;
          const positive = feature.contribution >= 0;
          return (
            <li key={feature.feature} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground/90">
                  {humanize(feature.feature)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {feature.value} · {formatDeviation(feature.contribution, feature.deviation)}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    positive
                      ? 'bg-gradient-to-r from-orange-400 to-red-400'
                      : 'bg-gradient-to-r from-green-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-muted-foreground/70 mt-3 italic">
        Contributions combine the model's global feature importance with how far each live
        reading deviates from its historical baseline.
      </p>
    </Card>
  );
};
