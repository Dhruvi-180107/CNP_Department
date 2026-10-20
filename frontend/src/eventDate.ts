import { useEffect, useState } from 'react';

/** True after the event's local calendar day has ended. */
export function isEventPast(value: string | Date | null | undefined, today = new Date()): boolean {
  if (!value) return false;
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) return false;
  return new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime()
    < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

/** A stable local-date key that updates automatically just after local midnight. */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => new Date().toDateString());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = window.setTimeout(() => setDay(new Date().toDateString()), nextMidnight.getTime() - now.getTime() + 50);
    return () => window.clearTimeout(timer);
  }, [day]);

  return day;
}

/** Start of today's local day as an ISO timestamp, for timezone-safe API filtering. */
export function localDayStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
