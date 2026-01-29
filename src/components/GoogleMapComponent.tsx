
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GoogleMapComponentProps {
  aqi: number;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
  onUserLocationChange?: (loc: { lat: number; lng: number; name?: string }) => void;
}

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({ 
  aqi, 
  apiKey,
  onApiKeyChange,
  onUserLocationChange,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [tempApiKey, setTempApiKey] = useState(apiKey || '');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getMarkerColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981'; // Green
    if (aqi <= 100) return '#f59e0b'; // Yellow
    if (aqi <= 150) return '#f97316'; // Orange
    if (aqi <= 200) return '#ef4444'; // Red
    if (aqi <= 300) return '#a855f7'; // Purple
    return '#dc2626'; // Dark Red
  };

  const loadGoogleMapsScript = (apiKey: string) => {
    if (window.google) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    // Choose center: prefer detected user location, otherwise fallback to default
    const defaultLocation = userLocation ?? { lat: 37.7749, lng: -122.4194 }; // San Francisco

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultLocation,
      styles: [
        // Dark theme styles
        { elementType: "geometry", stylers: [{ color: "#212121" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
        {
          featureType: "administrative",
          elementType: "geometry",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "administrative.country",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9e9e9e" }],
        },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#bdbdbd" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#181818" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#1b1b1b" }],
        },
        {
          featureType: "road",
          elementType: "geometry.fill",
          stylers: [{ color: "#2c2c2c" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#8a8a8a" }],
        },
        {
          featureType: "road.arterial",
          elementType: "geometry",
          stylers: [{ color: "#373737" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#3c3c3c" }],
        },
        {
          featureType: "road.highway.controlled_access",
          elementType: "geometry",
          stylers: [{ color: "#4e4e4e" }],
        },
        {
          featureType: "road.local",
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
        {
          featureType: "transit",
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#000000" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#3d3d3d" }],
        },
      ],
    });

    setMap(mapInstance);

    // Create marker
    const markerInstance = new google.maps.Marker({
      position: defaultLocation,
      map: mapInstance,
      title: `Air Quality Index: ${aqi}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: getMarkerColor(aqi),
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12,
      },
    });

    setMarker(markerInstance);

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="color: #333; padding: 10px;">
          <h3 style="margin: 0 0 8px 0; color: ${getMarkerColor(aqi)};">Air Quality Monitor</h3>
          <p style="margin: 0;"><strong>AQI:</strong> ${aqi}</p>
          <p style="margin: 4px 0 0 0;"><strong>Status:</strong> ${getAQIStatus(aqi)}</p>
        </div>
      `,
    });

    markerInstance.addListener('click', () => {
      infoWindow.open(mapInstance, markerInstance);
    });
  };

  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  useEffect(() => {
    if (apiKey) {
      loadGoogleMapsScript(apiKey);
    }
  }, [apiKey]);

  // Try to detect user's location (for centering the map) and notify parent
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          if (typeof onUserLocationChange === 'function') onUserLocationChange(loc);
      },
      (err) => {
        // silently ignore and keep fallback
        console.warn('Geolocation failed or denied:', err?.message || err);
      },
      { timeout: 10000 }
    );
  }, [onUserLocationChange]);

  // When script is loaded and we have a userLocation, try reverse geocoding to get a readable name
  useEffect(() => {
    if (!isScriptLoaded || !userLocation || !apiKey) return;
    if (!(window as any).google || !((window as any).google.maps && (window as any).google.maps.Geocoder)) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const latlng = { lat: userLocation.lat, lng: userLocation.lng } as google.maps.LatLngLiteral;
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const name = results[0].formatted_address;
          const locWithName = { ...userLocation, name };
          if (typeof onUserLocationChange === 'function') onUserLocationChange(locWithName);
          // update local state as well so map can center on userLocation (already set)
        } else {
          // No readable address found; ignore
        }
      });
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
  }, [isScriptLoaded, userLocation, apiKey, onUserLocationChange]);

  useEffect(() => {
    if (!isScriptLoaded || !apiKey) return;

    // If map already exists, just recenter when userLocation becomes available
    if (map) {
      if (userLocation) {
        map.setCenter(userLocation as google.maps.LatLngLiteral);
        if (marker) marker.setPosition(userLocation as google.maps.LatLngLiteral);
      }
      return;
    }

    initializeMap();
  }, [isScriptLoaded, apiKey, userLocation, map, marker]);

  useEffect(() => {
    if (marker && map) {
      // Update marker color when AQI changes
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: getMarkerColor(aqi),
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12,
      });
      marker.setTitle(`Air Quality Index: ${aqi}`);
    }
  }, [aqi, marker, map]);

  const handleApiKeySubmit = () => {
    if (onApiKeyChange) {
      onApiKeyChange(tempApiKey);
    }
  };

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl flex items-center justify-center border border-white/10 p-4">
        <div className="text-center space-y-3 sm:space-y-4 max-w-full">
          <h3 className="text-base sm:text-lg font-semibold text-white">Google Maps Integration</h3>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">Enter your Google Maps API key to enable the map</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto px-4">
            <Input
              type="text"
              placeholder="Enter Google Maps API Key"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="flex-1 text-xs sm:text-sm"
            />
            <Button onClick={handleApiKeySubmit} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
              Load Map
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground px-2">
            Get your API key from{' '}
            <a 
              href="https://console.cloud.google.com/google/maps-apis" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 relative">
      {!isScriptLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs sm:text-sm text-muted-foreground">Loading Google Maps...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};
