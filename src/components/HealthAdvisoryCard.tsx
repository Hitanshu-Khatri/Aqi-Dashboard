import React from 'react';
import { Card } from '@/components/ui/card';
import { Heart, Wind, ShieldCheck, AlertOctagon } from 'lucide-react';

export type HealthProfile = 'general' | 'sensitive' | 'child' | 'elderly';

interface HealthAdvisoryCardProps {
  aqi: number;
  profile: HealthProfile;
}

interface Advisory {
  band: string;
  headline: string;
  color: string;
  bgClass: string;
  general: string;
  sensitive: string;
  child: string;
  elderly: string;
  actions: string[];
  icon: React.ReactNode;
}

const ADVISORY_TABLE: Advisory[] = [
  {
    band: 'Good',
    headline: 'Air is clean and safe for everyone.',
    color: '#22c55e',
    bgClass: 'from-green-500/15 to-green-700/10 border-green-400/30',
    general: 'Enjoy outdoor activities freely.',
    sensitive: 'No precautions needed. Great day to be outside.',
    child: 'Safe for outdoor play and sports.',
    elderly: 'Ideal conditions for walks and exercise.',
    actions: ['Open windows for fresh air', 'Great time for outdoor exercise'],
    icon: <Wind className="h-5 w-5" />,
  },
  {
    band: 'Moderate',
    headline: 'Air quality is acceptable.',
    color: '#eab308',
    bgClass: 'from-yellow-500/15 to-yellow-700/10 border-yellow-400/30',
    general: 'Most people can continue normal outdoor activity.',
    sensitive: 'Consider reducing prolonged outdoor exertion if you feel symptoms.',
    child: 'Outdoor play is fine — take breaks if any coughing occurs.',
    elderly: 'Normal activity is safe. Stay hydrated.',
    actions: ['Monitor air quality if exercising', 'Keep rescue inhaler accessible'],
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    band: 'Unhealthy for Sensitive Groups',
    headline: 'Sensitive individuals should limit outdoor exertion.',
    color: '#f97316',
    bgClass: 'from-orange-500/15 to-orange-700/10 border-orange-400/40',
    general: 'You can be active outdoors, but watch for symptoms.',
    sensitive: 'Reduce prolonged or heavy outdoor exertion. Take breaks indoors.',
    child: 'Limit long outdoor play. Choose less strenuous activities.',
    elderly: 'Avoid heavy outdoor activity. Short walks only.',
    actions: ['Close windows', 'Avoid busy roads', 'Keep medication handy'],
    icon: <Heart className="h-5 w-5" />,
  },
  {
    band: 'Unhealthy',
    headline: 'Everyone may experience effects; sensitive groups should stay indoors.',
    color: '#ef4444',
    bgClass: 'from-red-500/15 to-red-700/10 border-red-400/40',
    general: 'Avoid prolonged outdoor exertion.',
    sensitive: 'Stay indoors. Use an air purifier if available.',
    child: 'Keep indoor activities. Postpone outdoor sports.',
    elderly: 'Remain indoors. Watch for breathing difficulty.',
    actions: ['Stay indoors', 'Run air purifier', 'Wear N95 mask outdoors', 'Close all windows'],
    icon: <AlertOctagon className="h-5 w-5" />,
  },
  {
    band: 'Very Unhealthy',
    headline: 'Health alert — everyone should minimize outdoor exposure.',
    color: '#a855f7',
    bgClass: 'from-purple-500/15 to-purple-700/10 border-purple-400/40',
    general: 'Avoid all outdoor exertion.',
    sensitive: 'Stay indoors with filtered air. Seek medical advice if symptoms appear.',
    child: 'Keep indoors. Watch for coughing or wheezing.',
    elderly: 'Remain indoors with closed windows and filtered air.',
    actions: [
      'Do not go outside unless essential',
      'N95 mask required outdoors',
      'Run HEPA purifier on max',
      'Seek medical help for symptoms',
    ],
    icon: <AlertOctagon className="h-5 w-5" />,
  },
  {
    band: 'Hazardous',
    headline: 'Emergency conditions — everyone at risk.',
    color: '#7c3aed',
    bgClass: 'from-purple-700/20 to-red-900/20 border-red-600/50',
    general: 'Stay indoors. Avoid all outdoor activity.',
    sensitive: 'Stay indoors. Follow emergency health advisories.',
    child: 'Keep indoors. Seek medical attention for any symptoms.',
    elderly: 'Stay indoors. Contact doctor if breathing is affected.',
    actions: [
      'Emergency: stay indoors',
      'Seal windows and doors',
      'Run HEPA purifier continuously',
      'Evacuate if advised by authorities',
    ],
    icon: <AlertOctagon className="h-5 w-5" />,
  },
];

function getAdvisory(aqi: number): Advisory {
  if (aqi <= 50) return ADVISORY_TABLE[0];
  if (aqi <= 100) return ADVISORY_TABLE[1];
  if (aqi <= 150) return ADVISORY_TABLE[2];
  if (aqi <= 200) return ADVISORY_TABLE[3];
  if (aqi <= 300) return ADVISORY_TABLE[4];
  return ADVISORY_TABLE[5];
}

const PROFILE_LABELS: Record<HealthProfile, string> = {
  general: 'General',
  sensitive: 'Sensitive (Asthma / Heart)',
  child: 'Child',
  elderly: 'Elderly',
};

export const HealthAdvisoryCard: React.FC<HealthAdvisoryCardProps> = ({ aqi, profile }) => {
  const advisory = getAdvisory(aqi);
  const message = advisory[profile];

  return (
    <Card
      className={`glass-card p-4 sm:p-5 bg-gradient-to-br border transition-all duration-500 ${advisory.bgClass}`}
      role="region"
      aria-label="Health advisory"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500"
          style={{ backgroundColor: `${advisory.color}22`, color: advisory.color }}
        >
          {advisory.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold" style={{ color: advisory.color }}>
              {advisory.band}
            </h3>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              Profile: {PROFILE_LABELS[profile]}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 mt-1 font-medium">
            {advisory.headline}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            {message}
          </p>
          {advisory.actions.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {advisory.actions.map((action) => (
                <li
                  key={action}
                  className="flex items-start gap-1.5 text-[11px] text-foreground/80"
                >
                  <span
                    className="mt-1 w-1 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: advisory.color }}
                  />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
};
