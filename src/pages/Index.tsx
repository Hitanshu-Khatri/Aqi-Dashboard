import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { AQIChart } from '@/components/AQIChart';
import { GoogleMapComponent } from '@/components/GoogleMapComponent';
import { CircularProgress } from '@/components/CircularProgress';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AQIBadge } from '@/components/AQIBadge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ShareReportButton } from '@/components/ShareReportButton';
import { HistoricalReport } from '@/components/HistoricalReport';
import { LocationDisplay } from '@/components/LocationDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@radix-ui/react-tooltip';


import { useAuth } from "../AuthContext.jsx";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

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
  // Prefer Vite env var `VITE_GOOGLE_MAPS_API_KEY`; if not present, fall back to runtime/localStorage entry
  const envGoogleMapsKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(envGoogleMapsKey ?? '');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartData, setChartData] = useState<Array<{ time: string, aqi: number }>>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();
  const [ismockdata,setismockdata]   = useState(true);
  const fetchSensorData = async () => {
    try {
      setIsOffline(false);
      // Simulated sensor data for demo - replace with actual ESP32 call
      

      if (ismockdata) {
        // Mock data for demonstration
        const mockData: SensorData = {
          aqi: Math.floor(Math.random() * 200) + 50,
          temperature: Math.floor(Math.random() * 15) + 20,
          humidity: Math.floor(Math.random() * 40) + 40,
          pm2_5: Math.floor(Math.random() * 50) + 10,
          pm10: Math.floor(Math.random() * 80) + 20,
          timestamp: new Date().toISOString()
        };
        setSensorData(mockData);

        // Update chart data
        setChartData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString(),
            aqi: mockData.aqi
          }];
          return newData.slice(-20); // Keep last 20 data points
        });

        // Update historical data
      setHistoricalData(prev => [...prev, { ...mockData, date: new Date().toISOString() }]);

      } else if (!ismockdata) {
        const response = await fetch(`http://${esp32IP}/data`);
        const data = await response.json();



        setSensorData(data);

        // Update chart data
        setChartData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString(),
            aqi: data.aqi
          }];
          return newData.slice(-20); // Keep last 20 data points
        });
      
        // Update historical data
      setHistoricalData(prev => [...prev, { ...data, date: new Date().toISOString() }]);
      }
      



      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
      setIsOffline(true);
      toast({
        title: "Connection Error",
        description: "Failed to fetch data from ESP32. Please check the connection.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchSensorData();
  };


  useEffect(() => {
    // If no env-provided key, load Google Maps API key from localStorage (allows runtime entry)
    if (!envGoogleMapsKey) {
      const savedApiKey = localStorage.getItem('googleMapsApiKey');
      if (savedApiKey) setGoogleMapsApiKey(savedApiKey);
    }

    if (user) {
      fetchSensorData();
      const interval = setInterval(fetchSensorData, refreshInterval);
      return () => clearInterval(interval);
    }
    // If user logs out, clear chart and sensor data
    setChartData([]);
    setHistoricalData([]);
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

  const handleGoogleMapsApiKeyChange = (apiKey: string) => {
    setGoogleMapsApiKey(apiKey);
    localStorage.setItem('googleMapsApiKey', apiKey);
  };

  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { level: 'Good', color: 'text-green-400', bgColor: 'from-green-500/20 to-green-600/20', ringColor: 'from-green-400 to-green-500' };
    if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-400', bgColor: 'from-yellow-500/20 to-yellow-600/20', ringColor: 'from-yellow-400 to-yellow-500' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: 'text-orange-400', bgColor: 'from-orange-500/20 to-orange-600/20', ringColor: 'from-orange-400 to-orange-500' };
    if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-400', bgColor: 'from-red-500/20 to-red-600/20', ringColor: 'from-red-400 to-red-500' };
    if (aqi <= 300) return { level: 'Very Unhealthy', color: 'text-purple-400', bgColor: 'from-purple-500/20 to-purple-600/20', ringColor: 'from-purple-400 to-purple-500' };
    return { level: 'Hazardous', color: 'text-red-600', bgColor: 'from-red-600/20 to-red-700/20', ringColor: 'from-red-500 to-red-600' };
  };

  const aqiInfo = getAQILevel(sensorData.aqi);

  if (isLoading && chartData.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Air Quality Monitor
              </h1>
              {isOffline ? (
                <WifiOff className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
              ) : (
                <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" color='white'/>
                <span className="truncate" style={{ color: 'white' }}>Real-time monitoring from ESP32 sensor</span>
              </p>
              <p className="text-xs truncate" style={{ color: 'white' }}>
                Last updated: {new Date(sensorData.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={isLoading}
            >
              <span className="hidden sm:inline">{ismockdata ? 'Mock: On' : 'Mock Data'}</span>
              <span className="sm:hidden">Mock</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="glass-button"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="glass-button p-2"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-full sm:max-w-md">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Live Dashboard</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Historical Reports</TabsTrigger>
          </TabsList>


          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            {/* AQI Display and Map Side by Side */}
            <div className="flex flex-col xl:flex-row gap-4 md:gap-6">
              {/* Main AQI Display */}
              <Card className={`glass-card p-4 sm:p-6 lg:p-8 flex-1 ${isOffline ? 'opacity-60' : ''}`}> 
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
                                  <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${aqiInfo.color} ${isLoading ? 'animate-pulse' : ''}`}>
                                    {isLoading ? '---' : sensorData.aqi}
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
                    apiKey={googleMapsApiKey}
                    onApiKeyChange={handleGoogleMapsApiKeyChange}
                    onUserLocationChange={(loc) => setUserLocation(loc)}
                  />
                </div>
              </Card>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <MetricCard
                title="Temperature"
                value={sensorData.temperature}
                unit="°C"
                icon="ThermometerSun"
                color="text-orange-400"
                isLoading={isLoading}
                isOffline={isOffline}
              />
              <MetricCard
                title="Humidity"
                value={sensorData.humidity}
                unit="%"
                icon="Droplet"
                color="text-blue-400"
                isLoading={isLoading}
                isOffline={isOffline}
              />
              <MetricCard
                title="PM2.5"
                value={sensorData.pm2_5}
                unit="μg/m³"
                icon="Cloud"
                color="text-purple-400"
                isLoading={isLoading}
                isOffline={isOffline}
              />
              <MetricCard
                title="PM10"
                value={sensorData.pm10}
                unit="μg/m³"
                icon="Gauge"
                color="text-green-400"
                isLoading={isLoading}
                isOffline={isOffline}
              />
            </div>

            {/* Chart */}
            <div className="mt-4">
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
            </div>
          </TabsContent>

          <TabsContent value="history">
            <HistoricalReport historicalData={historicalData} />
          </TabsContent>
        </Tabs>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        esp32IP={esp32IP}
        refreshInterval={refreshInterval}
        onSave={(ip, interval) => {
          setEsp32IP(ip);
          setRefreshInterval(interval);
        }}
      />
    </div>
  );
};

export default Index;

