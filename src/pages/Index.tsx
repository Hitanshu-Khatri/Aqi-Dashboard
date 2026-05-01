import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, MapPin, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react';
import { useAnimatedNumber } from '@/hooks/use-animated-number';
import { MetricCard } from '@/components/MetricCard';
import { AQIChart } from '@/components/AQIChart';
import { GoogleMapComponent } from '@/components/MapComponent';
import { CircularProgress } from '@/components/CircularProgress';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AQIBadge } from '@/components/AQIBadge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ShareReportButton } from '@/components/ShareReportButton';
import { HistoricalReport } from '@/components/HistoricalReport';
import { AQIPrediction } from '@/components/AQIPrediction';
import { AboutProject } from '@/components/AboutProject';
import { LocationDisplay } from '@/components/LocationDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@radix-ui/react-tooltip';
import { DemoControls } from '@/components/DemoControls';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import { HealthAdvisoryCard, type HealthProfile } from '@/components/HealthAdvisoryCard';
import { AlertsManager } from '@/components/AlertsManager';
import { ParticleView } from '@/components/ParticleView';
import type { ScenarioReading } from '@/demoScenarios/scenarios';


import { useAuth } from "../AuthContext.jsx";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { sensorAPI } from "@/services/sensorAPI";

interface SensorData {
  aqi: number;
  temperature: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
  timestamp: string;
}

interface HistoricalData {
  date: string;
  aqi: number;
  temperature: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
}

interface IndexProps {
  user?: any;
}

const Index = (props: IndexProps) => {
  const context = useAuth();
  const user = props.user !== undefined ? props.user : context.user;
  const [sensorData, setSensorData] = useState<SensorData>({
    aqi: 0,
    temperature: 0,
    humidity: 0,
    pm2_5: 0,
    pm10: 0,
    timestamp: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [esp32IP, setEsp32IP] = useState('10.25.62.37');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartData, setChartData] = useState<Array<{ time: string, aqi: number }>>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [realHistoricalData, setRealHistoricalData] = useState<HistoricalData[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAboutTab, setShowAboutTab] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('showAboutTab') === 'true';
  });
  const { toast } = useToast();
  const [ismockdata,setismockdata]   = useState(true);
  const [hasLiveRealData, setHasLiveRealData] = useState(false);
  // Once the backend is known to be down we stop hammering it to keep the
  // console (and network tab) quiet. Reset on refresh or interval change.
  const backendAvailableRef = useRef(true);
  // Cancels any in-flight ESP32 fetch when the user toggles mock / changes IP.
  const fetchAbortRef = useRef<AbortController | null>(null);
  const esp32WarnedRef = useRef(false);

  // Demo mode state — when active, live fetching is bypassed
  const [demoActiveId, setDemoActiveId] = useState<string | null>(null);
  const suppressFetchRef = useRef(false);

  // Health advisory profile + alert threshold (persisted in localStorage)
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() => {
    if (typeof window === 'undefined') return 'general';
    return (window.localStorage.getItem('healthProfile') as HealthProfile) || 'general';
  });
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('alertsEnabled') !== 'false';
  });
  const [alertThreshold, setAlertThreshold] = useState<number>(() => {
    if (typeof window === 'undefined') return 150;
    const raw = window.localStorage.getItem('alertThreshold');
    const parsed = raw ? parseInt(raw, 10) : 150;
    return Number.isFinite(parsed) ? parsed : 150;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('healthProfile', healthProfile);
    }
  }, [healthProfile]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('alertsEnabled', String(alertsEnabled));
      window.localStorage.setItem('alertThreshold', String(alertThreshold));
    }
  }, [alertsEnabled, alertThreshold]);

  // Accept a scripted reading from the Demo Controls and push it through the
  // same state pipeline normal readings use.
  const applyScenarioReading = useCallback(
    (reading: ScenarioReading) => {
      suppressFetchRef.current = true;
      const next: SensorData = {
        aqi: reading.aqi,
        temperature: reading.temperature,
        humidity: reading.humidity,
        pm2_5: reading.pm2_5,
        pm10: reading.pm10,
        timestamp: new Date().toISOString(),
      };
      setSensorData(next);
      setIsLoading(false);
      setIsOffline(false);
      setHasLiveRealData(false);
      setChartData((prev) => {
        const appended = [
          ...prev,
          { time: new Date().toLocaleTimeString(), aqi: next.aqi },
        ];
        return appended.slice(-20);
      });
      setHistoricalData((prev) => [
        ...prev,
        {
          aqi: next.aqi,
          temperature: next.temperature,
          humidity: next.humidity,
          pm2_5: next.pm2_5,
          pm10: next.pm10,
          date: next.timestamp,
        },
      ]);
    },
    [],
  );

  const handleScenarioStart = useCallback(
    (_id: string, name: string) => {
      setDemoActiveId(_id);
      suppressFetchRef.current = true;
      toast({
        title: `🎬 Demo: ${name}`,
        description: 'Scripted scenario is now driving the dashboard.',
      });
    },
    [toast],
  );
  const handleScenarioEnd = useCallback(() => {
    setDemoActiveId(null);
    suppressFetchRef.current = false;
    toast({
      title: 'Demo ended',
      description: 'Returning to live data stream.',
    });
  }, [toast]);

  const mapApiRowsToHistorical = (rows: any[] = []): HistoricalData[] => {
    return rows
      .map((item) => ({
        date: item.timestamp,
        aqi: Number(item.aqi),
        temperature: Number(item.temperature),
        humidity: Number(item.humidity),
        pm2_5: Number(item.pm2_5),
        pm10: Number(item.pm10),
      }))
      .filter((item) => !Number.isNaN(item.aqi));
  };

  const loadHistoricalFromDB = async () => {
    if (!backendAvailableRef.current) return;
    try {
      const [realRes, mockRes] = await Promise.all([
        sensorAPI.fetchSensorData('real', 500),
        sensorAPI.fetchSensorData('mock', 500),
      ]);

      const realRows = mapApiRowsToHistorical(realRes?.data || []);
      const mockRows = mapApiRowsToHistorical(mockRes?.data || []);

      // Backend returns latest first; chart/report expects oldest first.
      setRealHistoricalData(realRows.reverse());
      setHistoricalData(mockRows.reverse());
    } catch {
      // Backend unreachable — stop trying for this session
      backendAvailableRef.current = false;
    }
  };

  const saveToBackend = async (payload: {
    aqi: number;
    temperature: number;
    humidity: number;
    pm2_5: number;
    pm10: number;
    dataSource: 'mock' | 'real';
    location: { latitude: number; longitude: number } | null;
  }) => {
    if (!backendAvailableRef.current) return;
    try {
      await sensorAPI.saveSensorData(payload);
    } catch {
      backendAvailableRef.current = false;
    }
  };

  const fetchSensorData = async () => {
    // Skip network fetching while a demo scenario is driving the dashboard
    if (suppressFetchRef.current || demoActiveId) {
      setIsLoading(false);
      return;
    }

    if (ismockdata) {
      setIsOffline(false);
      setHasLiveRealData(false);
      const mockData: SensorData = {
        aqi: Math.floor(Math.random() * 200) + 50,
        temperature: Math.floor(Math.random() * 15) + 20,
        humidity: Math.floor(Math.random() * 40) + 40,
        pm2_5: Math.floor(Math.random() * 50) + 10,
        pm10: Math.floor(Math.random() * 80) + 20,
        timestamp: new Date().toISOString(),
      };
      setSensorData(mockData);

      void saveToBackend({
        aqi: mockData.aqi,
        temperature: mockData.temperature,
        humidity: mockData.humidity,
        pm2_5: mockData.pm2_5,
        pm10: mockData.pm10,
        dataSource: 'mock',
        location: userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : null,
      });

      setChartData((prev) => {
        const newData = [...prev, { time: new Date().toLocaleTimeString(), aqi: mockData.aqi }];
        return newData.slice(-20);
      });
      setHistoricalData((prev) => [
        ...prev,
        {
          aqi: mockData.aqi,
          temperature: mockData.temperature,
          humidity: mockData.humidity,
          pm2_5: mockData.pm2_5,
          pm10: mockData.pm10,
          date: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    // Real-sensor path: abortable + timeout so dead IPs don't block 30s
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);

    try {
      setIsOffline(false);
      const response = await fetch(`http://${esp32IP}/data`, { signal: controller.signal });
      const data = await response.json();
      window.clearTimeout(timeoutId);
      setHasLiveRealData(true);
      esp32WarnedRef.current = false;
      setSensorData(data);

      void saveToBackend({
        aqi: data.aqi,
        temperature: data.temperature,
        humidity: data.humidity,
        pm2_5: data.pm2_5,
        pm10: data.pm10,
        dataSource: 'real',
        location: userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : null,
      });

      setChartData((prev) => {
        const newData = [...prev, { time: new Date().toLocaleTimeString(), aqi: data.aqi }];
        return newData.slice(-20);
      });
      setRealHistoricalData((prev) => [
        ...prev,
        {
          aqi: data.aqi,
          temperature: data.temperature,
          humidity: data.humidity,
          pm2_5: data.pm2_5,
          pm10: data.pm10,
          date: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    } catch (error: unknown) {
      window.clearTimeout(timeoutId);
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      if (isAbort) {
        setIsLoading(false);
        return;
      }
      setIsOffline(true);
      setHasLiveRealData(false);
      setIsLoading(false);
      if (!esp32WarnedRef.current) {
        esp32WarnedRef.current = true;
        toast({
          title: 'ESP32 unreachable',
          description: `Could not reach ${esp32IP}. Switch to Mock Data or a Demo Scenario to continue.`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchSensorData();
  };


  useEffect(() => {
    if (user) {
      // Give backend / ESP32 one more chance whenever config changes
      backendAvailableRef.current = true;
      esp32WarnedRef.current = false;
      // Cancel any inflight fetch from a previous config
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      loadHistoricalFromDB();
      fetchSensorData();
      const interval = setInterval(fetchSensorData, refreshInterval);
      return () => {
        clearInterval(interval);
        if (fetchAbortRef.current) fetchAbortRef.current.abort();
      };
    }
    // If user logs out, clear chart and sensor data
    setChartData([]);
    setHistoricalData([]);
    setRealHistoricalData([]);
    setHasLiveRealData(false);
    setSensorData({
      aqi: 0,
      temperature: 0,
      humidity: 0,
      pm2_5: 0,
      pm10: 0,
      timestamp: new Date().toISOString()
    });
    // eslint-disable-next-line
  }, [esp32IP, refreshInterval, ismockdata, user]);

  const handleUserLocationChange = useCallback((loc: { lat: number; lng: number; name?: string } | null) => {
    setUserLocation(loc);
  }, []);

  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { level: 'Good', color: 'text-green-400', bgColor: 'from-green-500/20 to-green-600/20', ringColor: 'from-green-400 to-green-500' };
    if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-400', bgColor: 'from-yellow-500/20 to-yellow-600/20', ringColor: 'from-yellow-400 to-yellow-500' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: 'text-orange-400', bgColor: 'from-orange-500/20 to-orange-600/20', ringColor: 'from-orange-400 to-orange-500' };
    if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-400', bgColor: 'from-red-500/20 to-red-600/20', ringColor: 'from-red-400 to-red-500' };
    if (aqi <= 300) return { level: 'Very Unhealthy', color: 'text-purple-400', bgColor: 'from-purple-500/20 to-purple-600/20', ringColor: 'from-purple-400 to-purple-500' };
    return { level: 'Hazardous', color: 'text-red-600', bgColor: 'from-red-600/20 to-red-700/20', ringColor: 'from-red-500 to-red-600' };
  };

  const aqiInfo = getAQILevel(sensorData.aqi);
  const animatedAqi = useAnimatedNumber(sensorData.aqi);
  const animatedTemp = useAnimatedNumber(sensorData.temperature);
  const animatedHumidity = useAnimatedNumber(sensorData.humidity);
  const animatedPm25 = useAnimatedNumber(sensorData.pm2_5);
  const animatedPm10 = useAnimatedNumber(sensorData.pm10);

  const lastUpdatedText = useMemo(() => {
    const d = new Date(sensorData.timestamp);
    return Number.isNaN(d.getTime()) ? 'Waiting for live data' : d.toLocaleString();
  }, [sensorData.timestamp]);

  useEffect(() => {
    window.localStorage.setItem('showAboutTab', String(showAboutTab));
    if (!showAboutTab && activeTab === 'about') {
      setActiveTab('dashboard');
    }
  }, [showAboutTab, activeTab]);

  if (isLoading && chartData.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Accessibility: skip-to-content */}
      <a href="#main-dashboard" className="skip-to-content">Skip to dashboard</a>

      <div className="max-w-8xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-display tracking-tight">
                Air Quality Monitor
              </h1>
              {/* Live status indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
                isOffline
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : demoActiveId
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-green-500/10 border-green-500/30 text-green-400'
              }`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isOffline ? 'bg-red-400' : demoActiveId ? 'bg-amber-400 animate-breathe' : 'bg-green-400 animate-breathe'
                }`} />
                {isOffline ? (
                  <><WifiOff className="h-3 w-3" /> Offline</>
                ) : demoActiveId ? (
                  <><Activity className="h-3 w-3" /> Demo</>
                ) : (
                  <><Wifi className="h-3 w-3" /> Live</>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-foreground/70" />
                <span className="truncate text-foreground/80">Real-time monitoring from ESP32 sensor</span>
              </p>
              <p className="text-xs truncate text-foreground/60">
                Last updated: {lastUpdatedText}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AnomalyBadge
              history={historicalData.slice(-30)}
              current={{
                aqi: sensorData.aqi,
                pm2_5: sensorData.pm2_5,
                pm10: sensorData.pm10,
              }}
            />
            {user ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => { await signOut(auth); }}
                className="glass-button text-xs sm:text-sm"
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  // Dispatch a custom event to open AuthModal in App
                  window.dispatchEvent(new CustomEvent("open-auth-modal"));
                }}
                className="glass-button text-xs sm:text-sm"
              >
                Sign In
              </Button>
            )}
            <AlertsManager
              currentAqi={sensorData.aqi}
              threshold={alertThreshold}
              enabled={alertsEnabled}
              onRequestOpenSettings={() => setSettingsOpen(true)}
            />
            <DemoControls
              currentAqi={sensorData.aqi}
              onReading={applyScenarioReading}
              onScenarioStart={handleScenarioStart}
              onScenarioEnd={handleScenarioEnd}
            />
            <ShareReportButton
              sensorData={sensorData}
              location={userLocation ? (userLocation.name ?? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`) : undefined}
            />
            <Button
              variant={ismockdata ? 'default' : 'outline'}
              size="sm"
              onClick={() => setismockdata(prev => !prev)}
              className={`glass-button text-xs sm:text-sm ${ismockdata ? 'ring-2 ring-green-400' : ''}`}
              aria-pressed={ismockdata}
              disabled={isLoading || !!demoActiveId}
            >
              <span className="hidden sm:inline">{ismockdata ? 'Mock: On' : 'Mock Data'}</span>
              <span className="sm:hidden">Mock</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !!demoActiveId}
              className="glass-button"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="glass-button p-2"
              aria-label="Open settings"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className={`grid w-full ${showAboutTab ? 'grid-cols-4 sm:max-w-2xl' : 'grid-cols-3 sm:max-w-lg'} max-w-full`}>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Live Dashboard</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Historical Reports</TabsTrigger>
            <TabsTrigger value="prediction" className="text-xs sm:text-sm">Prediction</TabsTrigger>
            {showAboutTab && (
              <TabsTrigger value="about" className="text-xs sm:text-sm">About Us</TabsTrigger>
            )}
          </TabsList>


          <TabsContent value="dashboard" id="main-dashboard" className="space-y-4 md:space-y-6">
            {/* Health Advisory — plain-English "what does this mean for me" */}
            <HealthAdvisoryCard aqi={sensorData.aqi} profile={healthProfile} />

            {/* AQI Display and Map Side by Side */}
            <div className="flex flex-col xl:flex-row gap-4 md:gap-6">
              {/* Main AQI Display */}
              <Card className={`glass-card glass-card-glow p-4 sm:p-6 lg:p-8 flex-1 ${isOffline ? 'opacity-60' : ''}`}>
                <div className="text-center space-y-4 md:space-y-6">
                  <div className="relative inline-block">
                    <div className="relative">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* instead of help i kept pointer as cursor */}
                            <div className="cursor-pointer">
                              <CircularProgress
                                value={sensorData.aqi}
                                max={300}
                                size={window.innerWidth < 640 ? 140 : 180}
                                strokeWidth={window.innerWidth < 640 ? 10 : 12}
                                color={aqiInfo.color}
                                showGlow={!isLoading && !isOffline}
                              >
                                <div className="text-center">
                                  <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold tabular-nums ${aqiInfo.color} ${isLoading ? 'animate-pulse' : ''}`}>
                                    {isLoading ? '---' : animatedAqi}
                                  </div>
                                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">AQI</div>
                                </div>
                              </CircularProgress>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" align="center" sideOffset={8} className="max-w-[320px] p-3z-50">
                            <div className="space-y-1.5">
                              <p className="font-semibold text-xl">Air Quality Index (AQI)</p>
                              <p className="text-[12px]">A standardized way to measure and report daily air quality. It tells you how clean or unhealthy your air is, and what associated health effects might be of concern.</p>
                              <div className="text-xs space-y-1">
                                <div>• 0-50: Good (Green)</div>
                                <div>• 51-100: Moderate (Yellow)</div>
                                <div>• 101-150: Unhealthy for Sensitive (Orange)</div>
                                <div>• 151-200: Unhealthy (Red)</div>
                                <div>• 201-300: Very Unhealthy (Purple)</div>
                                <div>• 301+: Hazardous (Maroon)</div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <AQIBadge level={aqiInfo.level} color={aqiInfo.color} />
                    <LocationDisplay className="justify-center" />
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Air Quality Index measures overall air pollution level. Lower values indicate cleaner air.
                    </p>
                  </div>
                </div>
              </Card>
              {/* Map on the right */}
              <Card className="glass-card p-4 sm:p-6 flex-1 xl:max-w-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold">Sensor Location</h3>
                  <div className="text-xs text-muted-foreground">
                    Live monitoring point
                  </div>
                </div>
                <div className="h-64 sm:h-80">
                  <GoogleMapComponent
                    aqi={sensorData.aqi}
                    onUserLocationChange={handleUserLocationChange}
                  />
                </div>
              </Card>
            </div>

            {/* Metrics Grid — staggered entrance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="animate-slide-up stagger-1">
                <MetricCard
                  title="Temperature"
                  value={animatedTemp}
                  unit="°C"
                  icon="ThermometerSun"
                  color="text-orange-400"
                  isLoading={isLoading}
                  isOffline={isOffline}
                />
              </div>
              <div className="animate-slide-up stagger-2">
                <MetricCard
                  title="Humidity"
                  value={animatedHumidity}
                  unit="%"
                  icon="Droplet"
                  color="text-blue-400"
                  isLoading={isLoading}
                  isOffline={isOffline}
                />
              </div>
              <div className="animate-slide-up stagger-3">
                <MetricCard
                  title="PM2.5"
                  value={animatedPm25}
                  unit="μg/m³"
                  icon="Cloud"
                  color="text-purple-400"
                  isLoading={isLoading}
                  isOffline={isOffline}
                />
              </div>
              <div className="animate-slide-up stagger-4">
                <MetricCard
                  title="PM10"
                  value={animatedPm10}
                  unit="μg/m³"
                  icon="Gauge"
                  color="text-green-400"
                  isLoading={isLoading}
                  isOffline={isOffline}
                />
              </div>
            </div>

            {/* Chart + Particle View Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mt-4">
              <Card className={`glass-card p-4 sm:p-6 ${isOffline ? 'opacity-60' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold">AQI Trend</h3>
                  <div className="text-xs text-muted-foreground">
                    Last {chartData.length} readings
                  </div>
                </div>
                <div className="h-64 sm:h-80">
                  <AQIChart data={chartData} />
                </div>
              </Card>
              <ParticleView aqi={sensorData.aqi} />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <HistoricalReport historicalData={historicalData} realHistoricalData={realHistoricalData} />
          </TabsContent>

          <TabsContent value="prediction">
            <AQIPrediction
              realHistoricalData={realHistoricalData}
              currentAqi={sensorData.aqi}
              hasLiveRealData={hasLiveRealData && !ismockdata && !isOffline}
            />
          </TabsContent>

          {showAboutTab && (
            <TabsContent value="about">
              <AboutProject />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        esp32IP={esp32IP}
        refreshInterval={refreshInterval}
        showAboutTab={showAboutTab}
        healthProfile={healthProfile}
        alertsEnabled={alertsEnabled}
        alertThreshold={alertThreshold}
        onSave={(s) => {
          setEsp32IP(s.ip);
          setRefreshInterval(s.interval);
          setShowAboutTab(s.showAbout);
          setHealthProfile(s.healthProfile);
          setAlertsEnabled(s.alertsEnabled);
          setAlertThreshold(s.alertThreshold);
        }}
      />
    </div>
  );
};

export default Index;

