/**
 * Format a timestamp to HH.MM (Indonesian format with dot separator).
 */
export const formatTime = (timestamp: string | Date | null): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(':', '.');
};

/**
 * Format a timestamp to dd/mm/yyyy.
 */
export const formatDate = (timestamp: string | Date): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
 * Round distance to readable format.
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};
