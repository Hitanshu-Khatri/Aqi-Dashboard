import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Clapperboard, Flame, Pause, Play, Square } from 'lucide-react';
import { DEMO_SCENARIOS, getScenarioById, type ScenarioReading } from '@/demoScenarios/scenarios';

interface DemoControlsProps {
  onReading: (reading: ScenarioReading) => void;
  onScenarioStart: (scenarioId: string, scenarioName: string) => void;
  onScenarioEnd: () => void;
  currentAqi: number;
}

type PlaybackState = 'idle' | 'playing' | 'paused';

export const DemoControls: React.FC<DemoControlsProps> = ({
  onReading,
  onScenarioStart,
  onScenarioEnd,
  currentAqi,
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>('idle');
  const [frameIdx, setFrameIdx] = useState(0);
  const [injecting, setInjecting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const injectionRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearTimer();
    if (injectionRef.current != null) window.cancelAnimationFrame(injectionRef.current);
  }, []);

  const stopScenario = () => {
    clearTimer();
    setActiveScenarioId(null);
    setPlayback('idle');
    setFrameIdx(0);
    onScenarioEnd();
  };

  const tickScenario = (scenarioId: string, idx: number) => {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;
    if (idx >= scenario.readings.length) {
      stopScenario();
      return;
    }
    const reading = scenario.readings[idx];
    onReading(reading);
    setFrameIdx(idx + 1);
    const stepMs = Math.max(500, Math.round(scenario.durationMs / scenario.readings.length));
    timerRef.current = window.setTimeout(() => tickScenario(scenarioId, idx + 1), stepMs);
  };

  const startScenario = (scenarioId: string) => {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;
    clearTimer();
    setActiveScenarioId(scenarioId);
    setPlayback('playing');
    setFrameIdx(0);
    onScenarioStart(scenarioId, scenario.name);
    tickScenario(scenarioId, 0);
  };

  const pauseScenario = () => {
    clearTimer();
    setPlayback('paused');
  };

  const resumeScenario = () => {
    if (!activeScenarioId) return;
    setPlayback('playing');
    tickScenario(activeScenarioId, frameIdx);
  };

  const injectPollution = () => {
    if (injecting) return;
    setInjecting(true);
    const start = performance.now();
    const duration = 20000;
    const startAqi = Math.max(30, currentAqi);
    const targetAqi = Math.min(320, startAqi + 180);
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const aqi = Math.round(startAqi + (targetAqi - startAqi) * eased);
      onReading({
        aqi,
        temperature: 28 + Math.random() * 3,
        humidity: 40 + Math.random() * 5,
        pm2_5: Math.round(aqi * 0.42),
        pm10: Math.round(aqi * 0.65),
      });
      if (t < 1) {
        injectionRef.current = window.requestAnimationFrame(step);
      } else {
        setInjecting(false);
        injectionRef.current = null;
      }
    };
    injectionRef.current = window.requestAnimationFrame(step);
  };

  const activeScenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
  const progressPct = activeScenario
    ? Math.round((frameIdx / activeScenario.readings.length) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="glass-button text-xs sm:text-sm gap-1.5"
            aria-label="Open demo scenarios"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {activeScenario ? activeScenario.name : 'Demo'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 glass-card border-white/20">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            Demo Scenarios
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          {DEMO_SCENARIOS.map((scenario) => (
            <DropdownMenuItem
              key={scenario.id}
              onSelect={() => startScenario(scenario.id)}
              className="cursor-pointer flex flex-col items-start gap-0.5 py-2"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-base">{scenario.emoji}</span>
                <span className="font-medium text-sm">{scenario.name}</span>
                {activeScenarioId === scenario.id && (
                  <span className="ml-auto text-[10px] bg-green-500/25 text-green-300 px-1.5 rounded-full">
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground pl-6">
                {scenario.description}
              </span>
            </DropdownMenuItem>
          ))}
          {activeScenarioId && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={stopScenario}
                className="cursor-pointer text-red-300 focus:text-red-200"
              >
                <Square className="h-3.5 w-3.5 mr-2" /> Stop scenario
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant={injecting ? 'default' : 'outline'}
        size="sm"
        onClick={injectPollution}
        disabled={injecting || playback === 'playing'}
        className={`glass-button text-xs sm:text-sm gap-1.5 ${
          injecting ? 'ring-2 ring-red-400 animate-pulse' : ''
        }`}
        aria-label="Inject simulated pollution spike"
      >
        <Flame className="h-3.5 w-3.5 text-red-400" />
        <span className="hidden sm:inline">
          {injecting ? 'Injecting…' : 'Inject Smoke'}
        </span>
      </Button>

      {activeScenario && (
        <div className="flex items-center gap-2 pl-1">
          {playback === 'playing' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={pauseScenario}
              className="h-7 w-7 p-0"
              aria-label="Pause scenario"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={resumeScenario}
              className="h-7 w-7 p-0"
              aria-label="Resume scenario"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {progressPct}%
          </span>
        </div>
      )}
    </div>
  );
};
