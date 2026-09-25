export const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || 'Asia/Kolkata';

export function getBusinessDateKey(date = new Date(), timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatBusinessDateLabel(date = new Date(), timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
