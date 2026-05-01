import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AlertsManagerProps {
  currentAqi: number;
  threshold: number;
  enabled: boolean;
  onRequestOpenSettings: () => void;
}

type PermissionState = 'default' | 'granted' | 'denied';

const COOLDOWN_MS = 60_000;

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  currentAqi,
  threshold,
  enabled,
  onRequestOpenSettings,
}) => {
  const { toast } = useToast();
  const [permission, setPermission] = useState<PermissionState>('default');
  const [flashing, setFlashing] = useState(false);
  const lastFiredRef = useRef<number>(0);
  const wasAboveRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission as PermissionState);
  }, []);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Notifications unsupported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: `You will be alerted when AQI exceeds ${threshold}.`,
        });
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    }
  };

  useEffect(() => {
    if (!enabled || currentAqi <= 0) return;
    const above = currentAqi > threshold;
    if (above && !wasAboveRef.current) {
      const now = Date.now();
      if (now - lastFiredRef.current < COOLDOWN_MS) {
        wasAboveRef.current = true;
        return;
      }
      lastFiredRef.current = now;
      setFlashing(true);
      window.setTimeout(() => setFlashing(false), 2500);

      toast({
        title: `⚠️ AQI Alert: ${currentAqi}`,
        description: `Air quality has crossed your threshold of ${threshold}. Consider taking protective action.`,
        variant: 'destructive',
      });

      if (permission === 'granted') {
        try {
          // eslint-disable-next-line no-new
          new Notification('Air-Sense Alert', {
            body: `AQI ${currentAqi} exceeds your threshold (${threshold}). Check the dashboard.`,
            icon: '/favicon.ico',
            tag: 'aqi-threshold',
          });
        } catch (err) {
          console.warn('Notification failed:', err);
        }
      }
    }
    wasAboveRef.current = above;
  }, [currentAqi, threshold, enabled, permission, toast]);

  const isAbove = currentAqi > threshold && enabled;

  return (
    <div
      className={`transition-all ${
        flashing ? 'animate-pulse' : ''
      }`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={permission === 'granted' ? onRequestOpenSettings : requestPermission}
        className={`glass-button text-xs sm:text-sm gap-1.5 ${
          isAbove ? 'ring-2 ring-red-400 border-red-400/50' : ''
        }`}
        aria-label={
          isAbove
            ? `Alert active: AQI ${currentAqi} exceeds threshold ${threshold}`
            : 'Manage alerts'
        }
        title={
          enabled
            ? `Alert threshold: AQI > ${threshold}${permission === 'granted' ? ' (notifications on)' : ''}`
            : 'Alerts disabled — open settings to enable'
        }
      >
        {!enabled ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : isAbove ? (
          <BellRing className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">
          {enabled ? `Alert > ${threshold}` : 'Alerts'}
        </span>
      </Button>
    </div>
  );
};
