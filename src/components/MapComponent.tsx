
import React, { useEffect, useRef } from 'react';

interface MapComponentProps {
  aqi: number;
}

export const MapComponent: React.FC<MapComponentProps> = ({ aqi }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  const getMarkerColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#a855f7';
    return '#dc2626';
  };

  useEffect(() => {
    // This would integrate with Google Maps API
    // For now, we'll show a placeholder
    console.log('Map would show location with AQI:', aqi);
  }, [aqi]);

  return (
    <div 
      ref={mapRef}
      className="w-full h-64 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl relative overflow-hidden border border-white/10"
    >
      {/* Map placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div 
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl animate-float"
            style={{ backgroundColor: getMarkerColor(aqi) + '20', border: `2px solid ${getMarkerColor(aqi)}` }}
          >
            📍
          </div>
          <div>
            <div className="text-sm text-muted-foreground">ESP32 Location</div>
            <div className="text-xs text-muted-foreground mt-1">
              AQI: <span style={{ color: getMarkerColor(aqi) }}>{aqi}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid overlay for map-like appearance */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
};
