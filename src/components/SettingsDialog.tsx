
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { sensorAPI } from '@/services/sensorAPI';
import type { HealthProfile } from '@/components/HealthAdvisoryCard';

interface SettingsPayload {
  ip: string;
  interval: number;
  showAbout: boolean;
  healthProfile: HealthProfile;
  alertsEnabled: boolean;
  alertThreshold: number;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  esp32IP: string;
  refreshInterval: number;
  showAboutTab: boolean;
  healthProfile: HealthProfile;
  alertsEnabled: boolean;
  alertThreshold: number;
  onSave: (settings: SettingsPayload) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  esp32IP,
  refreshInterval,
  showAboutTab,
  healthProfile,
  alertsEnabled,
  alertThreshold,
  onSave,
}) => {
  const [ip, setIp] = useState(esp32IP);
  const [interval, setInterval] = useState(refreshInterval);
  const [showAbout, setShowAbout] = useState(showAboutTab);
  const [profile, setProfile] = useState<HealthProfile>(healthProfile);
  const [enabledAlerts, setEnabledAlerts] = useState(alertsEnabled);
  const [threshold, setThreshold] = useState(alertThreshold);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIp(esp32IP);
    setInterval(refreshInterval);
    setShowAbout(showAboutTab);
    setProfile(healthProfile);
    setEnabledAlerts(alertsEnabled);
    setThreshold(alertThreshold);
  }, [open, esp32IP, refreshInterval, showAboutTab, healthProfile, alertsEnabled, alertThreshold]);

  const handleSave = () => {
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
    const localhostRegex = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (!ipRegex.test(ip) && !localhostRegex.test(ip)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address format (e.g., 192.168.1.100)",
        variant: "destructive"
      });
      return;
    }

    onSave({
      ip,
      interval,
      showAbout,
      healthProfile: profile,
      alertsEnabled: enabledAlerts,
      alertThreshold: threshold,
    });
    onOpenChange(false);
    toast({
      title: "Settings Saved",
      description: "Configuration updated successfully",
    });
  };

  const handleReset = () => {
    setIp('192.168.235.37');
    setInterval(5000);
    setShowAbout(false);
    setProfile('general');
    setEnabledAlerts(true);
    setThreshold(150);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await sensorAPI.exportAsCSV();
      toast({
        title: "Export Ready",
        description: "CSV download started.",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Could not reach backend. Is the server running?",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">Dashboard Settings</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 sm:py-4">
          {/* ── Connection ── */}
          <div className="space-y-1.5">
            <Label htmlFor="esp32-ip" className="text-xs sm:text-sm font-medium">ESP32 IP Address</Label>
            <Input
              id="esp32-ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
              className="bg-white/5 border-white/20 focus:border-blue-400/50 text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              IP of your ESP32 device for real-time data.
            </p>
          </div>

          {/* ── Refresh ── */}
          <div className="space-y-1.5">
            <Label htmlFor="refresh-interval" className="text-xs sm:text-sm font-medium">Refresh Interval</Label>
            <Select value={interval.toString()} onValueChange={(value) => setInterval(parseInt(value))}>
              <SelectTrigger className="bg-white/5 border-white/20 text-sm">
                <SelectValue placeholder="Select refresh rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1 second</SelectItem>
                <SelectItem value="3000">3 seconds</SelectItem>
                <SelectItem value="5000">5 seconds</SelectItem>
                <SelectItem value="10000">10 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              How often to fetch new sensor data.
            </p>
          </div>

          {/* ── Health Profile ── */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">Health Profile</Label>
            <Select value={profile} onValueChange={(v) => setProfile(v as HealthProfile)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-sm">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General population</SelectItem>
                <SelectItem value="sensitive">Sensitive (asthma / heart)</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="elderly">Elderly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Tailors health advisory to your risk level.
            </p>
          </div>

          {/* ── AQI Alerts ── */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">AQI Alerts</Label>
            <div className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium leading-tight">Enable threshold alerts</p>
                <Switch checked={enabledAlerts} onCheckedChange={setEnabledAlerts} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="alert-threshold" className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Alert when AQI &gt;
                </Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  min={10}
                  max={500}
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(10, Math.min(500, parseInt(e.target.value) || 150)))}
                  disabled={!enabledAlerts}
                  className="bg-white/5 border-white/20 text-sm h-8"
                />
              </div>
            </div>
          </div>

          {/* ── About Tab toggle ── */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">About Us Tab</Label>
            <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium leading-tight">Show About Us tab in navigation</p>
              <Switch checked={showAbout} onCheckedChange={setShowAbout} />
            </div>
          </div>

          {/* ── Data Export ── */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">Data Export</Label>
            <Button
              variant="outline"
              className="w-full glass-button text-xs sm:text-sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export Current Data (CSV)'}
            </Button>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Download all readings as CSV (requires backend).
            </p>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button variant="outline" onClick={handleReset} className="glass-button text-xs sm:text-sm">
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-xs sm:text-sm">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
