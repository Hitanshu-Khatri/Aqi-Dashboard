import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface ParticleViewProps {
  aqi: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
}

const PARTICLE_MAX = 420;

function aqiToColor(aqi: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(500, aqi));
  if (clamped <= 50) {
    const t = clamped / 50;
    return { r: 34 + t * 100, g: 197, b: 94 };
  }
  if (clamped <= 100) {
    const t = (clamped - 50) / 50;
    return { r: 134 + t * 100, g: 197 - t * 20, b: 94 - t * 60 };
  }
  if (clamped <= 150) {
    const t = (clamped - 100) / 50;
    return { r: 234 + t * 15, g: 177 - t * 62, b: 34 - t * 22 };
  }
  if (clamped <= 200) {
    const t = (clamped - 150) / 50;
    return { r: 249 - t * 10, g: 115 - t * 47, b: 22 + t * 2 };
  }
  if (clamped <= 300) {
    const t = (clamped - 200) / 100;
    return { r: 239 - t * 71, g: 68 - t * 30, b: 68 + t * 119 };
  }
  const t = Math.min(1, (clamped - 300) / 200);
  return { r: 168 - t * 44, g: 38, b: 187 - t * 66 };
}

function targetParticleCount(aqi: number): number {
  const clamped = Math.max(0, Math.min(400, aqi));
  return Math.round(20 + (clamped / 400) * PARTICLE_MAX);
}

export const ParticleView: React.FC<ParticleViewProps> = ({ aqi, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const aqiRef = useRef(aqi);
  const dimRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    aqiRef.current = aqi;
  }, [aqi]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimRef.current = { w, h };
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnParticle = (): Particle => {
      const { w, h } = dimRef.current;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.2,
        vz: (Math.random() - 0.5) * 0.005,
        size: 1.5 + Math.random() * 2.5,
        life: 0.4 + Math.random() * 0.6,
      };
    };

    const step = () => {
      const { w, h } = dimRef.current;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const targetCount = targetParticleCount(aqiRef.current);
      const particles = particlesRef.current;

      while (particles.length < targetCount) particles.push(spawnParticle());
      if (particles.length > targetCount) particles.length = targetCount;

      ctx.fillStyle = 'rgba(8, 12, 26, 0.25)';
      ctx.fillRect(0, 0, w, h);

      const color = aqiToColor(aqiRef.current);
      const drift = Math.min(1.2, aqiRef.current / 200);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * (0.6 + drift);
        p.y += p.vy * (0.6 + drift);
        p.z += p.vz;
        if (p.z < 0.05) p.z = 0.05;
        if (p.z > 1) p.z = 1;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        const depthScale = 0.4 + p.z * 0.9;
        const radius = p.size * depthScale * 1.4;
        const alpha = 0.15 + p.z * 0.75 * p.life;

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
        grd.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        grd.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.35})`);
        grd.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
    };
  }, []);

  const color = aqiToColor(aqi);
  const density = targetParticleCount(aqi);

  return (
    <Card className={`glass-card glass-card-glow p-4 sm:p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm sm:text-base font-semibold">Particle Density Visualization</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Each particle represents suspended pollutants. Density and color track live AQI.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})` }}
          />
          <span className="text-muted-foreground tabular-nums">
            {density} particles
          </span>
        </div>
      </div>
      <div
        className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(30, 41, 80, 0.5), rgba(8, 12, 26, 1))',
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
        <div className="absolute bottom-2 left-3 text-[10px] text-white/60 tracking-wide">
          Live • AQI {aqi}
        </div>
      </div>
    </Card>
  );
};
