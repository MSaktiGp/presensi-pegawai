/**
 * Geolocation utilities for the attendance system.
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeoError {
  code: number;
  message: string;
}

/**
 * Request geolocation permission and get current position.
 */
export const getCurrentPosition = (): Promise<GeoPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Browser Anda tidak mendukung Geolocation. Gunakan browser modern seperti Chrome atau Firefox.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = 'Gagal mendapatkan lokasi.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Izin lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia. Pastikan GPS aktif.';
            break;
          case error.TIMEOUT:
            message = 'Permintaan lokasi timeout. Silakan coba lagi.';
            break;
        }
        reject({ code: error.code, message });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Always get fresh position
      }
    );
  });
};

/**
 * Calculate distance between two points (client-side, for display only).
 * Server ALWAYS recalculates - this is just for UI preview.
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
