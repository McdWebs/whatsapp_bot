import { config } from '../config';

export function getIsraelTime(date: Date = new Date()): Date {
  // Convert to Israel timezone (handles DST automatically)
  const israelTime = new Date(
    date.toLocaleString('en-US', {
      timeZone: config.timezone.default,
    })
  );
  return israelTime;
}

export function toIsraelTime(date: Date): Date {
  // Get current time in Israel
  const now = new Date();
  const israelNow = getIsraelTime(now);
  const utcNow = new Date(now.toISOString());

  // Calculate offset
  const offset = israelNow.getTime() - utcNow.getTime();

  // Apply offset to target date
  return new Date(date.getTime() + offset);
}

export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

