
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GoogleMapComponentProps {
  aqi: number;
  onUserLocationChange?: (loc: { lat: number; lng: number; name?: string }) => void;
}

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({ 
  aqi, 
  onUserLocationChange,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const getMarkerColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981'; // Green
    if (aqi <= 100) return '#f59e0b'; // Yellow
    if (aqi <= 150) return '#f97316'; // Orange
    if (aqi <= 200) return '#ef4444'; // Red
    if (aqi <= 300) return '#a855f7'; // Purple
    return '#dc2626'; // Dark Red
  };

  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Create custom marker icon with enhanced styling
  const createMarkerIcon = (color: string) => {
    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 40px;
            height: 40px;
            background-color: ${color};
            border: 4px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px ${color}80, 0 2px 12px rgba(0,0,0,0.4);
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            width: 12px;
            height: 12px;
            background-color: white;
            border-radius: 50%;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.2);
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 2px ${color}80, 0 0 0 8px ${color}40, 0 2px 12px rgba(0,0,0,0.4);
            }
            50% {
              box-shadow: 0 0 0 2px ${color}80, 0 0 0 12px ${color}20, 0 2px 12px rgba(0,0,0,0.4);
            }
            100% {
              box-shadow: 0 0 0 2px ${color}80, 0 0 0 8px ${color}40, 0 2px 12px rgba(0,0,0,0.4);
            }
          }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
      className: 'custom-marker'
    });
  };

  // Detect user location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        if (typeof onUserLocationChange === 'function') onUserLocationChange(loc);
      },
      (err) => {
        console.warn('Geolocation failed or denied:', err?.message || err);
      },
      { timeout: 10000 }
    );
  }, [onUserLocationChange]);

  // Center map on user location when available
  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 12, { animate: true });
      setMapReady(true);
    }
  }, [userLocation]);

  const defaultLocation: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : [37.7749, -122.4194]; // San Francisco fallback

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10">
      <MapContainer
        center={defaultLocation}
        zoom={12}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={100}
              pathOptions={{
                color: getMarkerColor(aqi),
                fillColor: getMarkerColor(aqi),
                fillOpacity: 0.1,
                weight: 2
              }}
            />
            <Marker 
              position={[userLocation.lat, userLocation.lng]}
              icon={createMarkerIcon(getMarkerColor(aqi))}
            >
              <Popup>
                <div style={{ color: '#333', padding: '12px', minWidth: '220px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: getMarkerColor(aqi), fontWeight: 'bold', fontSize: '16px' }}>
                    Air Quality Monitor
                  </h3>
                  <p style={{ margin: '0 0 6px 0' }}><strong>AQI:</strong> {aqi}</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Status:</strong> {getAQIStatus(aqi)}</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                    <strong>Location:</strong><br />
                    {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};
