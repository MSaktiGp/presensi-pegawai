/**
 * Format a timestamp to Indonesian locale time string.
 */
export const formatTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a timestamp to Indonesian locale date string.
 */
export const formatDate = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date for API query parameter.
 */
export const formatDateAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get greeting based on current hour.
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

/**
 * Get current attendance period.
 */
export const getCurrentPeriod = (): 'checkin' | 'checkout' | 'none' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'checkin';
  if (hour >= 15 && hour < 19) return 'checkout';
  return 'none';
};

/**
 * Round distance to readable format.
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};
