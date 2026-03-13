
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  esp32IP: string;
  refreshInterval: number;
  showAboutTab: boolean;
  onSave: (ip: string, interval: number, showAbout: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  esp32IP,
  refreshInterval,
  showAboutTab,
  onSave
}) => {
  const [ip, setIp] = useState(esp32IP);
  const [interval, setInterval] = useState(refreshInterval);
  const [showAbout, setShowAbout] = useState(showAboutTab);
  const { toast } = useToast();

  React.useEffect(() => {
    setIp(esp32IP);
    setInterval(refreshInterval);
    setShowAbout(showAboutTab);
  }, [open, esp32IP, refreshInterval, showAboutTab]);

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

    onSave(ip, interval, showAbout);
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/20 max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">Dashboard Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="esp32-ip" className="text-xs sm:text-sm font-medium">ESP32 IP Address</Label>
            <Input
              id="esp32-ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
              className="bg-white/5 border-white/20 focus:border-blue-400/50 text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Enter the IP address of your ESP32 device for real-time data.
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
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
              How often to fetch new data from the sensor.
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium">About Us Tab</Label>
            <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show About Us tab</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Turn on to show team/project page. Turn off to hide it from navigation.
                </p>
              </div>
              <Switch checked={showAbout} onCheckedChange={setShowAbout} />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium">Data Export</Label>
            <Button 
              variant="outline" 
              className="w-full glass-button text-xs sm:text-sm"
              onClick={() => {
                toast({
                  title: "Export Feature",
                  description: "Data export functionality coming soon!",
                });
              }}
            >
              Export Current Data
            </Button>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Download current readings as CSV or PDF report.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
          <Button variant="outline" onClick={handleReset} className="glass-button text-xs sm:text-sm w-full sm:w-auto">
            Reset to Default
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 flex-1 sm:flex-initial text-xs sm:text-sm">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
