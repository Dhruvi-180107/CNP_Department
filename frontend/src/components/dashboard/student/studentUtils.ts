/* Derivations the student dashboard needs on top of the dashboard fetches:
   events arrive as `unknown[]`, dates need calendar-day arithmetic, and join
   requests carry either a populated reference or a bare id. Everything here is
   derived from data the page already holds; nothing is invented. */
import type { ClubMembershipRecord, StudentJoinRequest } from '../../../types/studentDashboard';

const DAY_MS = 86_400_000;

export interface StudentEvent {
  _id: string;
  title: string;
  eventDate?: string;
  location?: string;
  description?: string;
  clubId?: { _id?: string; name?: string } | string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Narrow the `/events/upcoming` payload to the fields the page renders. */
export function asEvent(value: unknown): StudentEvent | null {
  if (!isRecord(value)) return null;
  const id = optionalString(value._id);
  const title = optionalString(value.title);
  if (!id || !title) return null;
  return {
    _id: id,
    title,
    eventDate: optionalString(value.eventDate) ?? optionalString(value.date),
    location: optionalString(value.location),
    description: optionalString(value.description),
    clubId: isRecord(value.clubId) || typeof value.clubId === 'string' ? (value.clubId as StudentEvent['clubId']) : null,
  };
}

export function sortEvents(events: StudentEvent[]): StudentEvent[] {
  return [...events].sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
}

function eventTimestamp(event: StudentEvent): number {
  if (!event.eventDate) return Number.POSITIVE_INFINITY;
  const time = new Date(event.eventDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function eventDateValue(event: StudentEvent): Date | null {
  if (!event.eventDate) return null;
  const date = new Date(event.eventDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clubNameOf(event: StudentEvent): string | null {
  const club = event.clubId;
  if (!club || typeof club === 'string') return null;
  return club.name?.trim() || null;
}

/** Populated references arrive as `{ _id }`, bare ones as a string. */
export function refId(ref: { _id?: string } | string | null | undefined): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref || undefined;
  return ref._id;
}

export function refName(ref: { name?: string } | string | null | undefined): string | null {
  if (!ref || typeof ref === 'string') return null;
  return ref.name?.trim() || null;
}

/* ── Calendar arithmetic (local days, so "tomorrow" means the student's tomorrow) ── */

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function calendarDaysUntil(value: string | Date, now = new Date()): number | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((startOfLocalDay(date) - startOfLocalDay(now)) / DAY_MS);
}

export interface Countdown {
  /** Large numeral, when the distance is worth showing as a number. */
  value?: string;
  /** The unit beside it, or the whole word for today/tomorrow. */
  label: string;
  /** One-line form for prose. */
  sentence: string;
}

export function countdownFor(days: number | null): Countdown | null {
  if (days === null) return null;
  if (days <= 0) return { label: 'Today', sentence: 'today' };
  if (days === 1) return { label: 'Tomorrow', sentence: 'tomorrow' };
  return { value: String(days), label: 'days', sentence: `in ${days} days` };
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/* ── Formatting ── */

export function formatLongDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function formatDayNumber(date: Date): string {
  return String(date.getDate());
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDayMonth(date: Date): string {
  return `${formatDayNumber(date)} ${formatMonthShort(date)}`;
}

/** "Just now", "12m ago", "3h ago", "4d ago", then a plain date. */
export function relativeTime(value: string | undefined, now = new Date()): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = calendarDaysUntil(date, now);
  if (days !== null && days < 7) return `${Math.max(days, 1)}d ago`;
  return formatDayMonth(date);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

/* ── Domain labels ── */

export interface MembershipRole {
  label: string;
  core: boolean;
}

export function membershipRole(record: ClubMembershipRecord): MembershipRole {
  const position = record.position?.trim();
  const core = record.membershipType === 'core_team';
  if (core && position) return { label: position, core: true };
  if (core) return { label: 'Core team', core: true };
  if (position) return { label: position, core: false };
  return { label: 'Member', core: false };
}

export interface ProjectStatus {
  label: string;
  tone: 'positive' | 'warning' | 'plain';
}

export function projectStatus(status: string | undefined): ProjectStatus | null {
  if (!status?.trim()) return null;
  const key = status.trim().toLowerCase();
  if (key === 'active') return { label: 'Active', tone: 'positive' };
  if (key === 'completed') return { label: 'Completed', tone: 'plain' };
  if (key === 'inactive' || key === 'archived') return { label: 'Inactive', tone: 'plain' };
  if (key === 'on_hold' || key === 'paused') return { label: 'On hold', tone: 'warning' };
  return { label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(), tone: 'plain' };
}

export interface RequestStatus {
  label: string;
  tone: 'positive' | 'warning' | 'negative' | 'plain';
}

export function requestStatus(status: string): RequestStatus {
  const key = status.toLowerCase();
  if (key === 'pending') return { label: 'Pending', tone: 'warning' };
  if (key === 'approved') return { label: 'Approved', tone: 'positive' };
  if (key === 'rejected') return { label: 'Rejected', tone: 'negative' };
  return { label: status, tone: 'plain' };
}

export function requestTarget(request: StudentJoinRequest): {
  kind: 'Club' | 'Project';
  id?: string;
  name: string;
} {
  const club = typeof request.clubId === 'object' && request.clubId ? request.clubId : null;
  const project = typeof request.projectId === 'object' && request.projectId ? request.projectId : null;
  if (club || typeof request.clubId === 'string') {
    return {
      kind: 'Club',
      id: refId(request.clubId),
      name: club?.name?.trim() || 'Club',
    };
  }
  return {
    kind: 'Project',
    id: refId(request.projectId),
    name: project?.name?.trim() || 'Project',
  };
}

export function tagToneClass(tone: 'positive' | 'warning' | 'negative' | 'plain'): string {
  return tone === 'plain' ? 'ui-tag ui-tag--plain' : `ui-tag is-${tone}`;
}
