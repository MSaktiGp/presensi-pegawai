'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentPosition, calculateDistance, GeoPosition } from '@/lib/geolocation';
import { formatDistance } from '@/lib/utils';
import { HiMapPin, HiExclamationTriangle, HiArrowPath, HiCheckCircle, HiXCircle } from 'react-icons/hi2';

interface GeolocationStatusProps {
  onLocationUpdate: (position: GeoPosition, distance: number) => void;
  officeLocation: { latitude: number; longitude: number; max_radius: number } | null;
}

export default function GeolocationStatus({ onLocationUpdate, officeLocation }: GeolocationStatusProps) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxRadius = officeLocation?.max_radius || 100;

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPosition(pos);

      if (officeLocation) {
        const dist = calculateDistance(
          pos.latitude,
          pos.longitude,
          officeLocation.latitude,
          officeLocation.longitude
        );
        setDistance(dist);
        onLocationUpdate(pos, dist);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setIsLoading(false);
  }, [officeLocation, onLocationUpdate]);

  // Fetch location on mount
  useEffect(() => {
    if (officeLocation) {
      fetchLocation();
    }
  }, [officeLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const isWithinRadius = distance !== null && distance <= maxRadius;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
        <HiMapPin className="text-lg" />
        Lokasi Saat Ini
      </label>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-gray-light)] rounded-xl">
          <div className="spinner" />
          <span className="text-sm text-[var(--text-secondary)]">Mendapatkan lokasi...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-accent-red-light border border-accent-red/20 rounded-xl p-4">
          <p className="text-sm text-accent-red font-medium flex items-center gap-1"><HiExclamationTriangle /> {error}</p>
          <button
            onClick={fetchLocation}
            className="btn btn-outline text-xs mt-2 py-1.5 px-3"
          >
            <HiArrowPath className="inline" /> Coba Lagi
          </button>
        </div>
      )}

      {/* Location data */}
      {position && !isLoading && (
        <div className="animate-fade-in space-y-3">
          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-gray-light)] rounded-lg p-3">
              <span className="text-xs text-[var(--text-muted)] block">Latitude</span>
              <span className="text-sm font-mono font-medium">{position.latitude.toFixed(6)}</span>
            </div>
            <div className="bg-[var(--bg-gray-light)] rounded-lg p-3">
              <span className="text-xs text-[var(--text-muted)] block">Longitude</span>
              <span className="text-sm font-mono font-medium">{position.longitude.toFixed(6)}</span>
            </div>
          </div>

          {/* Distance + Status */}
          {distance !== null && (
            <div
              className={`rounded-xl p-4 border-2 transition-all ${
                isWithinRadius
                  ? 'bg-success-green-light border-success-green/30'
                  : 'bg-accent-red-light border-accent-red/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    Jarak dari Kantor
                  </p>
                  <p className={`text-2xl font-bold ${isWithinRadius ? 'text-success-green' : 'text-accent-red'}`}>
                    {formatDistance(distance)}
                  </p>
                </div>
                <div className="text-right">
                  {isWithinRadius ? (
                    <div className="flex flex-col items-end">
                      <span className="badge badge-success animate-pulse-glow text-sm">
                        <HiCheckCircle className="inline" /> Dalam Radius
                      </span>
                      <span className="text-xs text-[var(--text-muted)] mt-1">
                        Maks: {maxRadius}m
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="badge badge-danger text-sm">
                        <HiXCircle className="inline" /> Diluar Radius
                      </span>
                      <span className="text-xs text-[var(--text-muted)] mt-1">
                        Maks: {maxRadius}m
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Accuracy info */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Akurasi GPS: ±{Math.round(position.accuracy)}m
            </span>
            <button
              onClick={fetchLocation}
              className="text-xs text-[var(--primary-medium)] hover:text-[var(--primary-dark)] font-medium flex items-center gap-1 transition-colors"
            >
              <HiArrowPath className="inline" /> Perbarui Lokasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
