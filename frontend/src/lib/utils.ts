/**
 * Format a timestamp to Indonesian locale time string.
 */
export const formatTime = (timestamp: string | Date): string => {
  if (!timestamp) return '-';
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
  if (!timestamp) return '-';
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
 * Checkin: always available. Checkout: from 16:30 (Friday from 11:00).
 */
export const getCurrentPeriod = (): 'checkin' | 'checkout' | 'both' => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay(); // 0=Sun, 5=Fri

  const checkoutStartHour = day === 5 ? 11 : 16;
  const checkoutStartMinute = day === 5 ? 0 : 30;

  const currentTotal = hour * 60 + minute;
  const targetTotal = checkoutStartHour * 60 + checkoutStartMinute;

  if (currentTotal >= targetTotal) return 'both';
  return 'checkin';
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
