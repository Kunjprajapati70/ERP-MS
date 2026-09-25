const config = require('../config/env');

function getAppTimezone() {
  return config.appTimezone || 'Asia/Kolkata';
}

function getCalendarDateKey(dateInput = new Date(), timeZone = getAppTimezone()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Stable Date used as the attendance day key: UTC midnight of the
 * calendar date in the application timezone (default Asia/Kolkata).
 * A new working day starts at local midnight, independent of Render UTC.
 */
function startOfBusinessDay(dateInput = new Date(), timeZone = getAppTimezone()) {
  const key = getCalendarDateKey(dateInput, timeZone);
  if (!key) return null;
  return new Date(`${key}T00:00:00.000Z`);
}

module.exports = {
  getAppTimezone,
  getCalendarDateKey,
  startOfBusinessDay,
};
