import { CONFIG } from '../config/constants';

/**
 * Get current date/time parts in WIB (Asia/Jakarta, UTC+7).
 */
export const getWIBParts = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  const hour = parseInt(parts.hour === '24' ? '0' : parts.hour, 10);
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    dateString: `${parts.year}-${parts.month}-${parts.day}`,
  };
};

/**
 * Get today's date string (YYYY-MM-DD) in WIB timezone.
 */
export const getWIBDateString = (): string => {
  return getWIBParts().dateString;
};
