import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Asia/Tokyo';

export function formatJstDate(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd');
}

export function formatJstDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd HH:mm');
}

export function formatJstTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm');
}
