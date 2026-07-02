import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Asia/Tokyo';

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatJstDate(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd');
}

export function formatJstDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd HH:mm');
}

export function formatJstTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm');
}

export function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  const hours = padTwoDigits(date.getHours());
  const minutes = padTwoDigits(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
