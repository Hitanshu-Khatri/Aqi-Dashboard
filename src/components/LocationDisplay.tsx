
import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface LocationDisplayProps {
  className?: string;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({ className = '' }) => {
  const [location, setLocation] = useState<string>('Detecting location...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // For demo purposes, we'll use a mock location
              // In production, you would use reverse geocoding with the coordinates
              const { latitude, longitude } = position.coords;
              
              // Mock location based on coordinates (replace with actual reverse geocoding)
              const mockLocation = `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
              setLocation(mockLocation);
            } catch (error) {
              setLocation('Location unavailable');
            } finally {
              setIsLoading(false);
            }
          },
          () => {
            setLocation('Location access denied');
            setIsLoading(false);
          },
          { timeout: 10000 }
        );
      } else {
        setLocation('Geolocation not supported');
        setIsLoading(false);
      }
    };

    getLocation();
  }, []);

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <MapPin className="h-4 w-4" />
      <span className={isLoading ? 'animate-pulse' : ''}>
        {location}
      </span>
    </div>
  );
};
