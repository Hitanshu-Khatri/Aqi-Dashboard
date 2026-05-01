export interface ScenarioReading {
  aqi: number;
  temperature: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
}

export interface DemoScenario {
  id: string;
  name: string;
  emoji: string;
  description: string;
  narrative: string;
  durationMs: number;
  readings: ScenarioReading[];
}

const buildCurve = (
  startAqi: number,
  peakAqi: number,
  endAqi: number,
  length: number,
  peakAt: number,
  jitter: number,
  baseTemp: number,
  baseHumidity: number,
  pmRatio = 0.35,
): ScenarioReading[] => {
  const out: ScenarioReading[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / (length - 1);
    let aqi: number;
    if (t <= peakAt) {
      const p = t / peakAt;
      const eased = 1 - Math.pow(1 - p, 2);
      aqi = startAqi + (peakAqi - startAqi) * eased;
    } else {
      const p = (t - peakAt) / (1 - peakAt);
      const eased = Math.pow(1 - p, 1.5);
      aqi = endAqi + (peakAqi - endAqi) * eased;
    }
    const noise = (Math.random() - 0.5) * jitter;
    const finalAqi = Math.max(10, Math.round(aqi + noise));
    const pm25 = Math.round(finalAqi * pmRatio);
    const pm10 = Math.round(finalAqi * (pmRatio + 0.25));
    const temp = Math.round((baseTemp + (Math.random() - 0.5) * 2) * 10) / 10;
    const hum = Math.round(baseHumidity + (Math.random() - 0.5) * 6);
    out.push({
      aqi: finalAqi,
      temperature: temp,
      humidity: Math.max(20, Math.min(95, hum)),
      pm2_5: pm25,
      pm10,
    });
  }
  return out;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'clean-morning',
    name: 'Clean Morning',
    emoji: '🌤️',
    description: 'Fresh air after rainfall',
    narrative: 'Post-rain atmosphere — AQI stays comfortably in the Good band with low particulates.',
    durationMs: 60000,
    readings: buildCurve(42, 58, 48, 40, 0.5, 4, 22, 68, 0.3),
  },
  {
    id: 'rush-hour',
    name: 'Rush Hour Pollution',
    emoji: '🚗',
    description: 'Traffic-driven AQI rise',
    narrative: 'Morning commute traffic pushes AQI from Good into the Unhealthy-for-Sensitive band.',
    durationMs: 60000,
    readings: buildCurve(55, 148, 120, 45, 0.7, 6, 28, 55, 0.38),
  },
  {
    id: 'wildfire',
    name: 'Wildfire Event',
    emoji: '🔥',
    description: 'Dangerous smoke surge',
    narrative: 'Wildfire smoke arrives — AQI rockets from Moderate to Very Unhealthy in 60 seconds.',
    durationMs: 60000,
    readings: buildCurve(75, 260, 220, 50, 0.55, 8, 34, 35, 0.45),
  },
  {
    id: 'indoor-smoke',
    name: 'Indoor Smoke Incident',
    emoji: '🏠',
    description: 'Short, sharp pollutant spike',
    narrative: 'Someone lit a candle near the sensor — sharp spike, then ventilation clears it.',
    durationMs: 60000,
    readings: buildCurve(45, 195, 60, 40, 0.35, 5, 24, 50, 0.5),
  },
];

export const getScenarioById = (id: string): DemoScenario | undefined =>
  DEMO_SCENARIOS.find((s) => s.id === id);
