import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EventForm } from '../../components/events/EventForm';
import { isEventPast, localDayStartIso, partitionEvents, useLocalDay } from '../../eventDate';
import { usePageLoading } from '../../context/LoadingContext';
import './events.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;

/* ── Marks ───────────────────────────────────────────────────────────────── */

function Icon({ children, className = 'evt-i' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const MARK = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.5s6.2-5.1 6.2-9.7a6.2 6.2 0 1 0-12.4 0c0 4.6 6.2 9.7 6.2 9.7Z" />
      <circle cx="12" cy="10.6" r="2.2" />
    </>
  ),
  left: <path d="m14.5 6-6 6 6 6" />,
  right: <path d="m9.5 6 6 6-6 6" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  arrow: <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  trash: (
    <path d="M4 7h16M9.5 7V4.8h5V7M6.6 7l.8 12a1.6 1.6 0 0 0 1.6 1.4h6a1.6 1.6 0 0 0 1.6-1.4l.8-12" />
  ),
  link: (
    <>
      <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
      <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5" />
    </>
  ),
  file: (
    <>
      <path d="M13 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8.5L13 3.5Z" />
      <path d="M13 3.5V8.5H18" />
    </>
  ),
};

/* ── Date helpers ────────────────────────────────────────────────────────── */

function eventDate(event: any): Date | null {
  const raw = event?.eventDate || event?.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function clubNameOf(event: any): string {
  const club = typeof event?.clubId === 'object' && event.clubId !== null ? event.clubId : null;
  return club?.name || 'Department Club';
}

function timeLabel(date: Date | null): string {
  return date ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}

function relativeDay(date: Date, today: Date): string {
  const diff = Math.round((startOfDay(date) - startOfDay(today)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function groupByDay(events: any[]) {
  const groups: { key: string; date: Date | null; items: any[] }[] = [];
  events.forEach(event => {
    const date = eventDate(event);
    const key = date ? dayKey(date) : 'tbd';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(event);
    else groups.push({ key, date, items: [event] });
  });
  return groups;
}

/* ── One ruled event entry ───────────────────────────────────────────────── */

interface EntryProps {
  event: any;
  canManage: boolean;
  onOpen: (event: any, trigger: HTMLElement) => void;
  onEdit: (event: any, trigger: HTMLElement) => void;
  agenda?: boolean;
}

function EventEntry({ event, canManage, onOpen, onEdit, agenda = false }: EntryProps) {
  const date = eventDate(event);
  const past = isEventPast(event.eventDate || event.date);

  return (
    <li className="evt-entry">
      <button
        type="button"
        className={`evt-entry__open${agenda ? ' evt-entry__open--agenda' : ''}`}
        onClick={e => onOpen(event, e.currentTarget)}
      >
        <span className="evt-entry__time">{timeLabel(date) || 'TBD'}</span>
        <span className="evt-entry__body">
          <span className="evt-entry__title">{event.title}</span>
          <span className="evt-entry__meta">
            <span className="evt-entry__meta-place">
              <span>{clubNameOf(event)}</span>
              {event.location && <span className="evt-dot" aria-hidden="true" />}
              {event.location && <span>{event.location}</span>}
            </span>
            {past && !agenda && <span className="evt-entry__past">Past</span>}
          </span>
        </span>
        {agenda && <span className="evt-entry__club ui-truncate">{clubNameOf(event)}</span>}
        {agenda && event.location && (
          <span className="evt-entry__venue ui-truncate">{event.location}</span>
        )}
        <span className="evt-entry__go" aria-hidden="true">
          <Icon className="evt-i evt-i--sm">{MARK.arrow}</Icon>
        </span>
      </button>
      {canManage && (
        <div className="evt-entry__actions">
          <button
            type="button"
            className="ui-icon-btn"
            aria-label={`Edit ${event.title}`}
            onClick={e => onEdit(event, e.currentTarget)}
          >
            <Icon className="evt-i evt-i--sm">{MARK.edit}</Icon>
          </button>
        </div>
      )}
    </li>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Events() {
  const { user } = useAuth();
  const { setPageLoading } = usePageLoading();
  const today = useLocalDay();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Club context and filter
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [myAssignedClubs, setMyAssignedClubs] = useState<any[]>([]);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'agenda'>('month');

  // Detail and delete state
  const [detailEvent, setDetailEvent] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setPageLoading(true);
      const clubsRes = await api<any>('GET', '/clubs').then(res => res.data).catch(() => []);
      setAllClubs(clubsRes);

      let assigned: any[] = [];
      if (user?.role === 'faculty_coordinator') {
        assigned = clubsRes.filter((c: any) => {
          const coordId = typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId?._id : c.facultyCoordinatorId;
          return coordId === user._id;
        });
        setMyAssignedClubs(assigned);
      } else if (user?.role === 'club_admin') {
        assigned = clubsRes;
        setMyAssignedClubs(clubsRes);
      }

      let evts: any[] = [];
      // Faculty Coordinator and Club Admin must see events from ALL clubs
      if (user?.role === 'faculty_coordinator' || user?.role === 'club_admin') {
        evts = await api<any>('GET', '/events').then(res => res.data).catch(() => []);
      } else {
        // Students and other roles view upcoming events across all clubs
        evts = await api<any>('GET', `/events/upcoming?from=${encodeURIComponent(localDayStartIso())}`).then(res => res.data).catch(() => []);
      }
      setEvents(evts);
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user, today]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash as string);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [loading]);

  /* ── Overlays ──────────────────────────────────────────────────────────── */

  const openDetail = (event: any, trigger?: HTMLElement | null) => {
    returnFocus.current = trigger ?? null;
    setDetailEvent(event);
    setConfirmDelete(false);
    setDeleteError('');
  };

  const closeDetail = () => {
    const trigger = returnFocus.current;
    setDetailEvent(null);
    setConfirmDelete(false);
    setDeleteError('');
    returnFocus.current = null;
    if (trigger) window.setTimeout(() => trigger.focus(), 0);
  };

  const openForm = (event: any | null, trigger?: HTMLElement | null) => {
    returnFocus.current = trigger ?? null;
    setEditingEvent(event);
    setShowForm(true);
    setDetailEvent(null);
    setConfirmDelete(false);
    setDeleteError('');
  };

  const closeForm = () => {
    const trigger = returnFocus.current;
    setShowForm(false);
    setEditingEvent(null);
    returnFocus.current = null;
    if (trigger) window.setTimeout(() => trigger.focus(), 0);
  };

  const finishForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    returnFocus.current = null;
    loadEvents();
  };

  const deleteEvent = async () => {
    if (!detailEvent) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api('DELETE', `/events/${detailEvent._id}`);
      setEvents(prev => prev.filter(e => e._id !== detailEvent._id));
      const trigger = returnFocus.current;
      setDetailEvent(null);
      setConfirmDelete(false);
      returnFocus.current = null;
      if (trigger) window.setTimeout(() => trigger.focus(), 0);
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (detailEvent) closeBtnRef.current?.focus();
  }, [detailEvent]);

  useEffect(() => {
    if (!detailEvent && !showForm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showForm) closeForm();
        else if (detailEvent) closeDetail();
        return;
      }
      if (event.key !== 'Tab') return;
      // Keep focus inside the open modal.
      const modal = document.querySelector('.ui-overlay .ui-modal');
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailEvent, showForm]);

  /* ── Derived data (unchanged rules) ────────────────────────────────────── */

  // Filter by selected club if set
  let filteredEvents = events;
  if (selectedClubFilter !== 'all') {
    filteredEvents = filteredEvents.filter(e => {
      const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return eClubId === selectedClubFilter;
    });
  }

  const { upcoming: upcomingEvents, past: pastEvents } = partitionEvents(filteredEvents);

  // Authorization check for event management
  const canManageEvent = (e: any) => {
    if (user?.role === 'club_admin') return true;
    if (user?.role === 'faculty_coordinator') {
      const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return myAssignedClubs.some(c => c._id === eClubId);
    }
    return false;
  };

  const canAddEvent =
    user?.role === 'club_admin' || (user?.role === 'faculty_coordinator' && myAssignedClubs.length > 0);

  /* ── Calendar logic ────────────────────────────────────────────────────── */

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailingBlank = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    return filteredEvents.filter(e => {
      const d = eventDate(e);
      return d !== null && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  // MOCK: the month grid, its "N events" meta and the "upcoming this month" count
  // are a client-side slice of the fetched list; no endpoint returns a month tally.
  const monthEvents = filteredEvents.filter(e => {
    const d = eventDate(e);
    return d !== null && d.getFullYear() === year && d.getMonth() === month;
  });
  const upcomingThisMonth = monthEvents.filter(e => !isEventPast(e.eventDate || e.date)).length;

  const todayDate = new Date(today);
  const todayKey = dayKey(todayDate);
  const selectedKey = selectedDate ? dayKey(selectedDate) : null;
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate.getDate()) : [];
  const seesPast = user?.role === 'faculty_coordinator' || user?.role === 'club_admin';
  const nextEvent = upcomingEvents[0] ?? null;
  const nextEventDate = nextEvent ? eventDate(nextEvent) : null;

  const goToMonth = (offset: number) => {
    setCurrentMonth(new Date(year, month + offset, 1));
    setSelectedDate(null);
  };
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(null);
  };
  const toggleDay = (date: Date) => {
    setSelectedDate(prev => (prev && dayKey(prev) === dayKey(date) ? null : date));
  };
  const jumpToDay = (date: Date) => {
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(date);
  };

  /* ── Selected day / next-up panel ──────────────────────────────────────── */

  const sideEvents = selectedDate ? selectedDayEvents : upcomingEvents.slice(0, 4);
  const sideTitle = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : 'Next up';
  const filteredClubName =
    selectedClubFilter === 'all'
      ? ''
      : allClubs.find(c => c._id === selectedClubFilter)?.name || 'This club';

  // MOCK: per-club event counts are a client-side tally over the month's events,
  // kept from the unfiltered list so the panel can switch the active club.
  const clubsThisMonth = (() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    events
      .filter(e => {
        const d = eventDate(e);
        return d !== null && d.getFullYear() === year && d.getMonth() === month;
      })
      .forEach(e => {
      const club = typeof e.clubId === 'object' && e.clubId !== null ? e.clubId : null;
      const id = club?._id || 'department';
      const name = club?.name || 'Department Club';
        const row = map.get(id);
        if (row) row.count += 1;
        else map.set(id, { id, name, count: 1 });
      });
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const showAllClubs = () => {
    setSelectedClubFilter('all');
    setSelectedDate(null);
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="evt-page">
        <header className="ui-page-head">
          <div className="ui-page-head__text">
            <div className="ui-skel evt-skel evt-skel--title" />
            <div className="ui-skel evt-skel evt-skel--sub" />
          </div>
        </header>
        <div className="evt-month">
          <section className="ui-panel">
            <header className="ui-panel__head">
              <div className="ui-skel evt-skel evt-skel--bar" />
              <div className="ui-skel evt-skel evt-skel--bar" />
            </header>
            <div className="evt-grid">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="evt-skel-cell">
                  <span className="ui-skel evt-skel--line" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const detailDate = detailEvent ? eventDate(detailEvent) : null;
  const detailClub =
    detailEvent && typeof detailEvent.clubId === 'object' && detailEvent.clubId !== null
      ? detailEvent.clubId
      : null;
  const detailOrganiser =
    detailEvent && typeof detailEvent.createdBy === 'object' && detailEvent.createdBy !== null
      ? detailEvent.createdBy
      : null;
  const detailCreated = detailEvent?.createdAt ? new Date(detailEvent.createdAt) : null;
  const detailIsPast = detailEvent ? isEventPast(detailEvent.eventDate || detailEvent.date) : false;
  const detailManage = detailEvent ? canManageEvent(detailEvent) : false;

  return (
    <div className="evt-page">
      {/* Page head */}
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title evt-page__title">Events</h1>
          <p className="evt-ledger">
            <span>
              <span className="evt-ledger__n">{upcomingThisMonth}</span> upcoming this month
            </span>
            <span>
              <span className="evt-ledger__n">{upcomingEvents.length}</span> upcoming in total
            </span>
            {seesPast && (
              <span>
                <span className="evt-ledger__n">{pastEvents.length}</span> past
              </span>
            )}
          </p>
        </div>

        <div className="ui-page-actions evt-page-actions">
          {allClubs.length > 0 && (
            <div className="evt-select">
              <label className="ui-visually-hidden" htmlFor="evt-club-filter">
                Filter by club
              </label>
              <select
                id="evt-club-filter"
                className="ui-field ui-field--select"
                value={selectedClubFilter}
                onChange={e => {
                  setSelectedClubFilter(e.target.value);
                  setSelectedDate(null);
                }}
              >
                <option value="all">All clubs · {events.length}</option>
                {allClubs.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Icon className="evt-i evt-i--sm">{MARK.down}</Icon>
            </div>
          )}

          <div className="ui-seg evt-view" role="group" aria-label="Calendar view">
            <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>
              Month
            </button>
            <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>
              Agenda
            </button>
          </div>

          {canAddEvent && (
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={e => openForm(null, e.currentTarget)}
            >
              <Icon>{MARK.plus}</Icon>
              New event
            </button>
          )}
        </div>
      </header>

      {view === 'month' ? (
        <div className="evt-month">
          {/* Month grid */}
          <section className="ui-panel evt-cal" aria-labelledby="evt-cal-title">
            <header className="ui-panel__head evt-cal__head">
              <div className="ui-panel__titles">
                <h2 id="evt-cal-title" className="ui-panel__title">
                  {monthLabel}
                </h2>
                <span className="ui-panel__meta">
                  {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <div className="evt-cal__nav">
                <button
                  type="button"
                  className="ui-icon-btn"
                  aria-label="Previous month"
                  onClick={() => goToMonth(-1)}
                >
                  <Icon>{MARK.left}</Icon>
                </button>
                <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={goToToday}>
                  Today
                </button>
                <button
                  type="button"
                  className="ui-icon-btn"
                  aria-label="Next month"
                  onClick={() => goToMonth(1)}
                >
                  <Icon>{MARK.right}</Icon>
                </button>
              </div>
            </header>

            <div className="evt-cal__scroll">
              <div className="evt-week" aria-hidden="true">
                {WEEKDAYS.map(day => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="evt-grid">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`lead-${i}`} className="evt-day evt-day--blank" aria-hidden="true" />
                ))}

                {days.map(day => {
                  const date = new Date(year, month, day);
                  const key = dayKey(date);
                  const dayEvents = getEventsForDay(day);
                  const isToday = todayKey === key;
                  const isSelected = selectedKey === key;
                  const shown = dayEvents.slice(0, 2);
                  const extra = dayEvents.length - shown.length;

                  return (
                    <div
                      key={key}
                      className={`evt-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                    >
                      <div className="evt-day__head">
                        <button
                          type="button"
                          className="evt-day__num"
                          aria-pressed={isSelected}
                          aria-label={`${date.toLocaleDateString(undefined, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                          onClick={() => toggleDay(date)}
                        >
                          {day}
                        </button>
                        {extra > 0 && (
                          <button
                            type="button"
                            className="evt-day__more"
                            onClick={() => toggleDay(date)}
                            aria-label={`Show all ${dayEvents.length} events on ${date.toLocaleDateString()}`}
                          >
                            +{extra}
                          </button>
                        )}
                      </div>

                      <div className="evt-day__events">
                        {shown.map(e => (
                          <button
                            key={e._id}
                            type="button"
                            className={`evt-chip${isEventPast(e.eventDate || e.date) ? ' is-past' : ''}`}
                            title={`${e.title} · ${clubNameOf(e)}`}
                            onClick={evt => openDetail(e, evt.currentTarget)}
                          >
                            {e.title}
                          </button>
                        ))}
                      </div>
                      <div className="evt-day__dots" aria-hidden="true">
                        {dayEvents.slice(0, 3).map(e => (
                          <span
                            key={e._id}
                            className={`evt-day__dot${isEventPast(e.eventDate || e.date) ? ' is-past' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: trailingBlank }).map((_, i) => (
                  <div key={`trail-${i}`} className="evt-day evt-day--blank" aria-hidden="true" />
                ))}
              </div>
            </div>

            <footer className="ui-panel__foot evt-cal__foot">
              <span className="evt-legend">
                <span>
                  <span className="evt-legend__mark" aria-hidden="true" />
                  Upcoming
                </span>
                {seesPast && (
                  <span>
                    <span className="evt-legend__mark is-past" aria-hidden="true" />
                    Past
                  </span>
                )}
              </span>
              <span className="evt-cal__hint">Select a day for its agenda</span>
            </footer>
          </section>

          {/* Selected day / next up */}
          <div className="evt-rail">
            <aside className="ui-panel evt-side" aria-labelledby="evt-side-title">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 id="evt-side-title" className="ui-panel__title">
                  {sideTitle}
                </h2>
                <span className="ui-panel__meta">
                  {selectedDate
                    ? `${sideEvents.length} ${sideEvents.length === 1 ? 'event' : 'events'}`
                    : `${upcomingEvents.length} upcoming`}
                </span>
              </div>
              {selectedDate && (
                <button
                  type="button"
                  className="ui-icon-btn"
                  aria-label="Clear selected day"
                  onClick={() => setSelectedDate(null)}
                >
                  <Icon className="evt-i evt-i--sm">{MARK.close}</Icon>
                </button>
              )}
            </header>

            {sideEvents.length > 0 ? (
              selectedDate ? (
                <ul className="evt-list">
                  {sideEvents.map(event => (
                    <EventEntry
                      key={event._id}
                      event={event}
                      canManage={canManageEvent(event)}
                      onOpen={openDetail}
                      onEdit={(evt, trigger) => openForm(evt, trigger)}
                    />
                  ))}
                </ul>
              ) : (
                <div>
                  {groupByDay(upcomingEvents)
                    .slice(0, 3)
                    .map(group => (
                      <section key={group.key} className="evt-group">
                        <header className="evt-group__head evt-group__head--tight">
                          <h3 className="evt-group__date">
                            {group.date
                              ? group.date.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'Date to be confirmed'}
                          </h3>
                          <span className="evt-group__meta">
                            {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                          </span>
                        </header>
                        <ul className="evt-list">
                          {group.items.slice(0, 5).map(event => (
                            <EventEntry
                              key={event._id}
                              event={event}
                              canManage={canManageEvent(event)}
                              onOpen={openDetail}
                              onEdit={(evt, trigger) => openForm(evt, trigger)}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                </div>
              )
            ) : (
              <div className="evt-side__empty">
                <span className="ui-empty__mark">
                  <Icon>{MARK.calendar}</Icon>
                </span>
                <p className="ui-empty__title">
                  {events.length === 0
                    ? 'No events yet'
                    : selectedClubFilter !== 'all'
                      ? `Nothing from ${filteredClubName}`
                      : selectedDate
                        ? 'Nothing on this day'
                        : 'Nothing upcoming'}
                </p>
                <p className="ui-empty__text">
                  {events.length === 0
                    ? canAddEvent
                      ? 'The calendar is empty. Create the first event for a club.'
                      : 'Club events appear here as soon as they are published.'
                    : selectedClubFilter !== 'all'
                      ? 'This club has no events in the selected period.'
                      : selectedDate
                        ? nextEvent && nextEventDate
                          ? `The next event is ${nextEvent.title} on ${nextEventDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`
                          : 'Pick another day, or switch to the agenda for the full list.'
                        : 'No upcoming events are scheduled. Past events stay on the calendar.'}
                </p>
                {events.length === 0 && canAddEvent && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--sm"
                    onClick={e => openForm(null, e.currentTarget)}
                  >
                    New event
                  </button>
                )}
                {events.length > 0 && selectedClubFilter !== 'all' && (
                  <button type="button" className="ui-btn ui-btn--sm" onClick={showAllClubs}>
                    Show all clubs
                  </button>
                )}
                {events.length > 0 && selectedClubFilter === 'all' && selectedDate && nextEventDate && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--quiet ui-btn--sm"
                    onClick={() => jumpToDay(nextEventDate)}
                  >
                    Go to {nextEventDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </button>
                )}
              </div>
            )}
            </aside>

            {clubsThisMonth.length > 0 && (
              <section className="ui-panel evt-clubs" aria-labelledby="evt-clubs-title">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 id="evt-clubs-title" className="ui-panel__title">
                      Clubs
                    </h2>
                    <span className="ui-panel__meta">
                      {clubsThisMonth.length} this month
                    </span>
                  </div>
                </header>
                <ul className="evt-clublist">
                  {clubsThisMonth.map(club => {
                    const pressed = selectedClubFilter === club.id;
                    return (
                      <li key={club.id}>
                        {club.id === 'department' ? (
                          <div className="evt-clubrow">
                            <span className="evt-clubrow__name">{club.name}</span>
                            <span className="ui-count">{club.count}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="evt-clubrow"
                            aria-pressed={pressed}
                            onClick={() =>
                              setSelectedClubFilter(prev => (prev === club.id ? 'all' : club.id))
                            }
                          >
                            <span className="evt-clubrow__name">{club.name}</span>
                            <span className={`ui-count${pressed ? ' ui-count--accent' : ''}`}>
                              {club.count}
                            </span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="evt-agenda">
          <section className="ui-panel" aria-labelledby="evt-agenda-title">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 id="evt-agenda-title" className="ui-panel__title">
                  Upcoming
                </h2>
                <span className="ui-panel__meta">
                  {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
            </header>

            {upcomingEvents.length > 0 ? (
              <div className="ui-panel__body--flush">
                {groupByDay(upcomingEvents).map(group => {
                  const relative = group.date ? relativeDay(group.date, todayDate) : '';
                  const label = group.date
                    ? ['Today', 'Tomorrow', 'Yesterday'].includes(relative)
                      ? `${relative} · ${group.date.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}`
                      : group.date.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                    : 'Date to be confirmed';

                  return (
                    <section key={group.key} className="evt-group">
                      <header className="evt-group__head">
                        <h3 className="evt-group__date">{label}</h3>
                        <span className="evt-group__meta">
                          {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                        </span>
                      </header>
                      <ul className="evt-list">
                        {group.items.map(event => (
                          <EventEntry
                            key={event._id}
                            event={event}
                            canManage={canManageEvent(event)}
                            onOpen={openDetail}
                            onEdit={(evt, trigger) => openForm(evt, trigger)}
                            agenda
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="ui-panel__body">
                <div className="ui-empty">
                  <span className="ui-empty__mark">
                    <Icon>{MARK.calendar}</Icon>
                  </span>
                  <p className="ui-empty__title">
                    {selectedClubFilter !== 'all' ? `No upcoming events from ${filteredClubName}` : 'No upcoming events'}
                  </p>
                  <p className="ui-empty__text">
                    {selectedClubFilter !== 'all'
                      ? 'Change the club filter to see the rest of the calendar.'
                      : 'Past events stay on the calendar. Switch to Month to browse them.'}
                  </p>
                  {selectedClubFilter !== 'all' && (
                    <button type="button" className="ui-btn ui-btn--sm" onClick={showAllClubs}>
                      Show all clubs
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {seesPast && pastEvents.length > 0 && (
            <details className="evt-past">
              <summary>
                <Icon className="evt-i evt-i--sm evt-past__chev">{MARK.down}</Icon>
                <span className="evt-past__label">Past events</span>
                <span className="ui-count">{pastEvents.length}</span>
              </summary>
              <div className="evt-past__body">
                {groupByDay(pastEvents).map(group => (
                  <section key={group.key} className="evt-group">
                    <header className="evt-group__head">
                      <h3 className="evt-group__date">
                        {group.date
                          ? group.date.toLocaleDateString(undefined, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Date to be confirmed'}
                      </h3>
                      <span className="evt-group__meta">
                        {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                      </span>
                    </header>
                    <ul className="evt-list">
                      {group.items.map(event => (
                        <EventEntry
                          key={event._id}
                          event={event}
                          canManage={canManageEvent(event)}
                          onOpen={openDetail}
                          onEdit={(evt, trigger) => openForm(evt, trigger)}
                          agenda
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Event detail */}
      {detailEvent && (
        <div
          className="ui-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div
            className="ui-modal evt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evt-detail-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 id="evt-detail-title" className="ui-h2">
                  {detailEvent.title}
                </h2>
                <p className="evt-modal__sub">
                  <span>{detailClub?.name || 'Department Club'}</span>
                  <span className="evt-dot" aria-hidden="true" />
                  <span className={`ui-tag${detailIsPast ? '' : ' is-positive'}`}>
                    {detailIsPast ? 'Past' : 'Upcoming'}
                  </span>
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="ui-icon-btn"
                aria-label="Close event details"
                onClick={closeDetail}
              >
                <Icon className="evt-i evt-i--sm">{MARK.close}</Icon>
              </button>
            </header>

            <div className="ui-modal__body evt-detail">
              {deleteError && (
                <p className="ui-notice ui-notice--error" role="alert">
                  <svg className="evt-i evt-i--sm" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.8v4.6M12 16.1v.2" />
                  </svg>
                  {deleteError}
                </p>
              )}

              <div className="evt-detail__lead">
                <div className="evt-dateblock evt-dateblock--lg" aria-hidden="true">
                  <span className="evt-dateblock__m">
                    {detailDate
                      ? detailDate.toLocaleDateString(undefined, { month: 'short' })
                      : 'TBD'}
                  </span>
                  <span className="evt-dateblock__d">
                    {detailDate ? detailDate.getDate() : '—'}
                  </span>
                </div>
                <div className="evt-detail__when">
                  <p className="evt-detail__day">
                    {detailDate
                      ? detailDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Date to be confirmed'}
                  </p>
                  <p className="evt-detail__clock">
                    {detailDate ? timeLabel(detailDate) : 'Time to be confirmed'}
                    {detailDate ? ` · ${relativeDay(detailDate, todayDate)}` : ''}
                  </p>
                </div>
              </div>

              <dl className="evt-facts">
                <div className="evt-fact">
                  <dt>Venue</dt>
                  <dd>{detailEvent.location || 'To be confirmed'}</dd>
                </div>
                <div className="evt-fact">
                  <dt>Club</dt>
                  <dd>{detailClub?.name || 'Department Club'}</dd>
                </div>
                <div className="evt-fact">
                  <dt>Organiser</dt>
                  <dd>
                    {detailOrganiser?.name || 'Not recorded'}
                    {detailOrganiser?.role
                      ? ` · ${String(detailOrganiser.role).replace(/_/g, ' ')}`
                      : ''}
                  </dd>
                </div>
                <div className="evt-fact">
                  <dt>Added</dt>
                  <dd>
                    {detailCreated && !Number.isNaN(detailCreated.getTime())
                      ? detailCreated.toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Not recorded'}
                  </dd>
                </div>
              </dl>

              {detailEvent.description && (
                <p className="evt-detail__desc">{detailEvent.description}</p>
              )}

              {(detailEvent.eventLink || detailEvent.relatedDocument?.url) && (
                <div className="evt-detail__links">
                  {detailEvent.eventLink && (
                    <a
                      className="ui-btn ui-btn--quiet ui-btn--sm"
                      href={detailEvent.eventLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="evt-i evt-i--sm">{MARK.link}</Icon>
                      {detailEvent.eventLinkName?.trim() || 'Event link'}
                    </a>
                  )}
                  {detailEvent.relatedDocument?.url && (
                    <a
                      className="ui-btn ui-btn--quiet ui-btn--sm"
                      href={detailEvent.relatedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="evt-i evt-i--sm">{MARK.file}</Icon>
                      {detailEvent.relatedDocumentName?.trim() ||
                        detailEvent.relatedDocument.originalName ||
                        'Related document'}
                    </a>
                  )}
                </div>
              )}
            </div>

            {detailManage && (
              <footer className="ui-modal__foot">
                {confirmDelete ? (
                  <>
                    <p className="evt-confirm__text">Delete this event? This cannot be undone.</p>
                    <span className="ui-grow" />
                    <button
                      type="button"
                      className="ui-btn ui-btn--ghost"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="ui-btn ui-btn--danger"
                      onClick={deleteEvent}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete event'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="ui-btn ui-btn--danger ui-btn--sm"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Icon className="evt-i evt-i--sm">{MARK.trash}</Icon>
                      Delete
                    </button>
                    <span className="ui-grow" />
                    <button type="button" className="ui-btn ui-btn--quiet" onClick={closeDetail}>
                      Close
                    </button>
                    <button
                      type="button"
                      className="ui-btn ui-btn--primary"
                      onClick={e => openForm(detailEvent, e.currentTarget)}
                    >
                      Edit event
                    </button>
                  </>
                )}
              </footer>
            )}
          </div>
        </div>
      )}

      {/* Create / edit */}
      {showForm && canAddEvent && (
        <div
          className="ui-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            className="ui-modal ui-modal--wide evt-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evt-form-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 id="evt-form-title" className="ui-h2">
                  {editingEvent ? 'Edit event' : 'New event'}
                </h2>
                <p className="evt-modal__sub">
                  {editingEvent
                    ? 'Changes are visible on the club calendar as soon as you save.'
                    : 'Publish to a club calendar. The event appears in the agenda and the month grid.'}
                </p>
              </div>
              <button
                type="button"
                className="ui-icon-btn"
                aria-label="Close form"
                onClick={closeForm}
              >
                <Icon className="evt-i evt-i--sm">{MARK.close}</Icon>
              </button>
            </header>

            <EventForm
              availableClubs={myAssignedClubs}
              clubId={
                editingEvent
                  ? typeof editingEvent.clubId === 'object'
                    ? editingEvent.clubId?._id
                    : editingEvent.clubId
                  : myAssignedClubs.length === 1
                    ? myAssignedClubs[0]._id
                    : undefined
              }
              event={editingEvent}
              onSave={finishForm}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
