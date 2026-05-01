import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { sensorAPI } from '@/services/sensorAPI';
import { ExplainPanel, type FeatureContribution } from '@/components/ExplainPanel';
import { useAnimatedNumber } from '@/hooks/use-animated-number';

interface PredictionResponse {
  prediction: number;
  topFeatures?: FeatureContribution[];
  confidence?: number;
}

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
  hasLiveRealData: boolean;
}

interface ChartRow {
  label: string;
  actual: number | null;
  predicted: number | null;
}

interface PredictionMetrics {
  model: string;
  score: number;
  rating: string;
  metrics: {
    test_mae: number;
    test_rmse: number;
    test_r2: number;
    cv_mae: number;
    cv_rmse: number;
    cv_r2: number;
  };
  horizons?: number[];
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
): Promise<PredictionResponse> {
  if (history.length === 0) return { prediction: 0 };
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
  return {
    prediction: Math.round(data.prediction),
    topFeatures: data.topFeatures,
    confidence: data.confidence,
  };
}

// Horizons the model was actually trained on.
// 180 min (3h) is the safest and most accurate horizon.
const PREDICT_HORIZON = 180; // minutes

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

function qualityColorClass(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 65) return 'text-yellow-300';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
}

function scoreHexColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

// â”€â”€ Animated speedometer gauge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SpeedometerGauge({
  score,
  rating,
  loading,
}: {
  score: number;
  rating: string;
  loading: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) { setDisplay(0); return; }
    const target = score;
    const duration = 1400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * target);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score, loading]);

  const cx = 110, cy = 120, r = 86;
  const color = scoreHexColor(display);
  const angle = Math.PI * (1 - display / 100);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);
  // Score arc always spans < 180°, so large-arc-flag must stay 0.
  const nx = cx + (r - 18) * Math.cos(angle);
  const ny = cy - (r - 18) * Math.sin(angle);

  const zones = [
    { from: 0,  to: 50,  fill: 'rgba(239,68,68,0.22)' },
    { from: 50, to: 65,  fill: 'rgba(249,115,22,0.22)' },
    { from: 65, to: 80,  fill: 'rgba(234,179,8,0.22)' },
    { from: 80, to: 100, fill: 'rgba(34,197,94,0.26)' },
  ];

  return (
    <svg
      viewBox="0 0 220 170"
      className="w-full max-w-[260px] mx-auto select-none overflow-visible"
    >
      <defs>
        <filter id="spd-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="spd-arc-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Track base */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none"
        stroke="rgba(148,163,184,0.10)"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Colored zone bands */}
      {zones.map(({ from, to, fill }) => {
        const a1 = Math.PI * (1 - from / 100);
        const a2 = Math.PI * (1 - to / 100);
        const x1 = (cx + r * Math.cos(a1)).toFixed(2);
        const y1 = (cy - r * Math.sin(a1)).toFixed(2);
        const x2 = (cx + r * Math.cos(a2)).toFixed(2);
        const y2 = (cy - r * Math.sin(a2)).toFixed(2);
        return (
          <path
            key={from}
            d={`M ${x1},${y1} A ${r},${r} 0 0 1 ${x2},${y2}`}
            fill="none"
            stroke={fill}
            strokeWidth="14"
          />
        );
      })}

      {/* Animated score arc */}
      {display > 0.5 && (
        <path
          d={`M ${(cx - r).toFixed(2)},${cy} A ${r},${r} 0 0 1 ${ex.toFixed(2)},${ey.toFixed(2)}`}
          fill="none"
          stroke="url(#spd-arc-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="url(#spd-glow)"
        />
      )}

      {/* Tick marks + labels */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const a = Math.PI * (1 - pct / 100);
        const ix = (cx + (r - 12) * Math.cos(a)).toFixed(2);
        const iy = (cy - (r - 12) * Math.sin(a)).toFixed(2);
        const ox = (cx + (r + 2) * Math.cos(a)).toFixed(2);
        const oy = (cy - (r + 2) * Math.sin(a)).toFixed(2);
        const lx = (cx + (r + 12) * Math.cos(a)).toFixed(2);
        const ly = (cy - (r + 12) * Math.sin(a)).toFixed(2);
        return (
          <g key={pct}>
            <line
              x1={ix} y1={iy} x2={ox} y2={oy}
              stroke="rgba(148,163,184,0.55)" strokeWidth="1.5"
            />
            <text
              x={lx} y={ly}
              fontSize="9"
              fill="rgba(148,163,184,0.7)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {pct}
            </text>
          </g>
        );
      })}

      {/* Needle shadow */}
      <line
        x1={cx} y1={cy}
        x2={(nx + 1.2).toFixed(2)} y2={(ny + 1.2).toFixed(2)}
        stroke="rgba(0,0,0,0.45)" strokeWidth="3" strokeLinecap="round"
      />
      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke="white" strokeWidth="2.2" strokeLinecap="round"
        filter="url(#spd-glow)"
      />

      {/* Hub */}
      <circle cx={cx} cy={cy} r="7" fill={color} filter="url(#spd-glow)" />
      <circle cx={cx} cy={cy} r="3.5" fill="white" />

      {/* MODEL SCORE label above the number so it never collides with the arc */}
      <text
        x={cx} y={cy + 28}
        textAnchor="middle"
        fontSize="8"
        fill="rgba(148,163,184,0.65)"
        letterSpacing="1.4"
      >
        MODEL SCORE
      </text>
      {/* Score number */}
      <text
        x={cx} y={cy + 48}
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill={color}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {Math.round(display)}%
      </text>
      {/* Rating */}
      <text
        x={cx} y={cy + 62}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill={color}
      >
        {loading ? '...' : rating}
      </text>
    </svg>
  );
}

// â”€â”€ Custom chart tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ChartTooltipPayloadEntry {
  name?: string;
  value?: number | null;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950/95 border border-white/10 rounded-xl px-3 py-2.5
                    shadow-2xl text-sm backdrop-blur-md min-w-[140px]">
      <p className="text-gray-400 text-[11px] font-medium mb-1.5 tracking-wide">{label}</p>
      {payload.map((entry) =>
        entry.value != null ? (
          <div key={entry.name} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: entry.color }} />
            <span className="text-gray-300 text-xs">{entry.name}:</span>
            <span className="font-bold text-xs" style={{ color: entry.color }}>
              {entry.value}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

// â”€â”€ Metric display box â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MetricBox({
  label, value, hint, color, className = '',
}: {
  label: string; value: string; hint?: string; color?: string; className?: string;
}) {
  return (
    <div className={`bg-white/5 border border-white/[0.08] rounded-lg p-3 ${className}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${color ?? 'text-foreground'}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</div>}
    </div>
  );
}

export const AQIPrediction: React.FC<AQIPredictionProps> = ({
  realHistoricalData,
  currentAqi,
  hasLiveRealData,
}) => {
  const hasHistory = realHistoricalData.length > 0;
  const [forecast3h, setForecast3h] = useState<number | null>(null);
  const [loading3h, setLoading3h] = useState(false);
  const [usingML, setUsingML] = useState(false);
  const [topFeatures, setTopFeatures] = useState<FeatureContribution[] | undefined>(undefined);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [predictionMetrics, setPredictionMetrics] = useState<PredictionMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const animatedCurrentAqi = useAnimatedNumber(currentAqi);
  const animatedForecast = useAnimatedNumber(forecast3h ?? currentAqi);

  // Fetch 3-hour ML prediction whenever live data changes
  const fetch3h = useCallback(async () => {
    if (!hasLiveRealData || realHistoricalData.length === 0) return;
    const sorted = [...realHistoricalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setLoading3h(true);
    try {
      const pred = await fetchMLPrediction(realHistoricalData, PREDICT_HORIZON);
      setForecast3h(pred.prediction);
      setTopFeatures(pred.topFeatures);
      setConfidence(pred.confidence);
      setUsingML(true);
    } catch {
      // Backend unreachable — fallback to formula
      setForecast3h(predictAtMinutes(sorted, PREDICT_HORIZON));
      setTopFeatures(undefined);
      setConfidence(undefined);
      setUsingML(false);
    } finally {
      setLoading3h(false);
    }
  }, [realHistoricalData, hasLiveRealData]);

  useEffect(() => {
    if (!hasLiveRealData) return;
    fetch3h();
  }, [fetch3h, hasLiveRealData]);

  // Fetch model metrics once for quality meter
  useEffect(() => {
    let mounted = true;
    setMetricsLoading(true);
    sensorAPI.getPredictionMetrics()
      .then((data) => { if (mounted) setPredictionMetrics(data as PredictionMetrics); })
      .catch(() => { if (mounted) setPredictionMetrics(null); })
      .finally(() => { if (mounted) setMetricsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const { chartRows, transitionLabel } = useMemo(() => {
    if (realHistoricalData.length === 0) {
      return { chartRows: [] as ChartRow[], transitionLabel: null as string | null };
    }
    const sorted = [...realHistoricalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recentActual = sorted.slice(-14);

    const actualRows: ChartRow[] = recentActual.map((row) => ({
      label: new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actual: row.aqi,
      predicted: null,
    }));

    const lastActual = recentActual[recentActual.length - 1];
    const lastLabel = new Date(lastActual.date).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    });

    // Bridge point then single 3h forecast dot
    const forecastPoints: ChartRow[] = [
      { label: lastLabel, actual: lastActual.aqi, predicted: lastActual.aqi },
      { label: '+3h', actual: null, predicted: forecast3h ?? null },
    ];

    return { chartRows: [...actualRows, ...forecastPoints], transitionLabel: lastLabel };
  }, [realHistoricalData, forecast3h]);

  const delta = forecast3h != null ? forecast3h - currentAqi : null;

  if (!hasHistory) {
    return (
      <Card className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
        <div className="w-12 h-12 rounded-full bg-sky-500/15 border border-sky-400/25 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-sky-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12a8 8 0 0 1 8-8" />
            <path d="M20 12a8 8 0 0 0-8-8" />
            <path d="M7 14a5 5 0 0 1 10 0" />
            <rect x="10" y="14" width="4" height="6" rx="1" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Waiting for Live Data</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Connect ESP32 and keep Mock Data off. Prediction starts automatically when first live readings arrive.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!hasLiveRealData && (
        <Card className="glass-card p-3 border border-amber-400/25 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            Live stream is reconnecting. Showing last received readings until new data arrives.
          </p>
        </Card>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current */}
        <Card className="glass-card glass-card-glow p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current AQI</div>
          <div className="text-5xl font-black mt-1 tabular-nums" style={{ color: aqiColor(currentAqi) }}>
            {animatedCurrentAqi}
          </div>
          <div className="text-sm mt-1.5 font-semibold" style={{ color: aqiColor(currentAqi) }}>
            {aqiLevel(currentAqi)}
          </div>
        </Card>

        {/* 3-hour forecast */}
        <Card className="glass-card glass-card-glow p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
            Predicted AQI in 3 hours
            {usingML && (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30">
                ML Model
              </span>
            )}
          </div>
          <div className="text-5xl font-black mt-1 tabular-nums"
            style={{ color: forecast3h != null ? aqiColor(forecast3h) : 'rgba(148,163,184,0.5)' }}>
            {animatedForecast}
          </div>
          {(forecast3h != null || loading3h) && (
            <div className="text-sm mt-1.5 flex items-center gap-2">
              <span className="font-semibold" style={{ color: aqiColor(forecast3h ?? currentAqi) }}>
                {aqiLevel(forecast3h ?? currentAqi)}
              </span>
              {delta != null && !loading3h && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded
                  ${delta >= 0 ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                  {delta >= 0 ? '+' : '-'} {Math.abs(delta)}
                </span>
              )}
              {loading3h && (
                <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Trained on 3-hour window - best reliable horizon for this model.
          </p>
        </Card>
      </div>

      {/* Gradient area chart */}
      <Card className="glass-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">AQI Trend &amp; 3-Hour Forecast</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cyan = actual readings | Orange dot = ML 3h forecast</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartRows} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.40} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fb923c" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'rgba(148,163,184,0.65)' }}
                axisLine={{ stroke: 'rgba(148,163,184,0.12)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgba(148,163,184,0.65)' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              {transitionLabel && (
                <ReferenceLine
                  x={transitionLabel}
                  stroke="rgba(148,163,184,0.30)"
                  strokeDasharray="4 4"
                  label={{ value: 'NOW', position: 'top', fontSize: 9, fill: 'rgba(148,163,184,0.55)' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#gradActual)"
                dot={{ r: 3.5, fill: '#38bdf8', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: 'rgba(56,189,248,0.4)', strokeWidth: 4 }}
                connectNulls={false}
                name="Actual AQI"
                isAnimationActive
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="7 4"
                fill="url(#gradForecast)"
                dot={{ r: 6, fill: '#fb923c', stroke: 'rgba(251,146,60,0.35)', strokeWidth: 4 }}
                activeDot={{ r: 8, fill: '#fb923c', stroke: 'rgba(251,146,60,0.4)', strokeWidth: 4 }}
                connectNulls={false}
                name="Forecast +3h"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Explainability panel */}
      {forecast3h != null && (
        <ExplainPanel
          topFeatures={topFeatures}
          confidence={confidence}
          prediction={forecast3h}
          currentAqi={currentAqi}
          usingML={usingML}
        />
      )}

      {/* Speedometer + metrics */}
      <Card className="glass-card p-5">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Gauge */}
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col items-center">
            <h3 className="text-sm font-semibold mb-0.5">Model Accuracy Meter</h3>
            <p className="text-[11px] text-muted-foreground mb-3 text-center">
              Composite score from test + cross-validation
            </p>
            <SpeedometerGauge
              score={predictionMetrics?.score ?? 0}
              rating={predictionMetrics?.rating ?? '-'}
              loading={metricsLoading}
            />
          </div>

          {/* Metrics grid */}
          <div className="flex-1 grid grid-cols-2 gap-3 content-start w-full">
            {predictionMetrics ? (
              <>
                <MetricBox label="Algorithm"  value={predictionMetrics.model} className="col-span-2" />
                <MetricBox label="Rating"     value={predictionMetrics.rating}
                           color={qualityColorClass(predictionMetrics.score)} />
                <MetricBox label="Score"      value={`${predictionMetrics.score.toFixed(1)} / 100`}
                           color={qualityColorClass(predictionMetrics.score)} />
                <MetricBox label="Test MAE"   value={String(predictionMetrics.metrics.test_mae)}
                           hint="Lower = better (AQI units)" />
                <MetricBox label="Test RMSE"  value={String(predictionMetrics.metrics.test_rmse)}
                           hint="Lower = better" />
                <MetricBox label="Test R2"    value={String(predictionMetrics.metrics.test_r2)}
                           hint="Higher = better (0-1)" />
                <MetricBox label="CV MAE"     value={String(predictionMetrics.metrics.cv_mae)}
                           hint="Cross-validation" />
                {predictionMetrics.horizons && predictionMetrics.horizons.length > 0 && (
                  <MetricBox label="Trained Horizons"
                             value={predictionMetrics.horizons.map((h) => `${h}m`).join(' | ')}
                             className="col-span-2" />
                )}
              </>
            ) : metricsLoading ? (
              <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading model metrics...
              </div>
            ) : (
              <p className="col-span-2 text-sm text-muted-foreground">
                Metrics unavailable. Ensure backend is running.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
