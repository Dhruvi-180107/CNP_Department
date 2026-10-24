import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { usePageLoading } from '../../context/LoadingContext';
import './notifications.css';

interface NotificationMetadata {
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  department?: string;
  semester?: number | string;
  status?: string;
  requestDate?: string;
  projectId?: string;
  projectName?: string;
  clubId?: string;
  clubName?: string;
  entityName?: string;
  quantity?: number;
  source?: string;
  hasAttachments?: boolean;
  attachmentCount?: number;
  creationTime?: string;
  submissionTime?: string;
  reason?: string;
  feedbackText?: string;
  action?: string;
}

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  link?: string;
  actionText?: string;
  metadata?: NotificationMetadata;
  isRead: boolean;
  createdAt: string;
}

/* ── The five marks. One drawing per source family, 24px grid. ───────────── */

type Family = 'request' | 'club' | 'project' | 'event' | 'system';
type MarkName = Family | 'check' | 'checkAll' | 'arrow' | 'arrowLeft' | 'filter' | 'caret';

const FAMILY_ORDER: Family[] = ['request', 'club', 'project', 'event', 'system'];

const FAMILY_LABEL: Record<Family, string> = {
  request: 'Requests',
  club: 'Clubs',
  project: 'Projects',
  event: 'Events',
  system: 'System',
};

const MARKS: Record<MarkName, ReactNode> = {
  request: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M3.5 13h4.3l1.6 2.4h5.2l1.6-2.4h4.3" />
    </>
  ),
  club: (
    <>
      <circle cx="9.2" cy="8.2" r="3.2" />
      <path d="M3.6 19.4a5.6 5.6 0 0 1 11.2 0" />
      <path d="M16.4 5.5a3 3 0 0 1 0 5.7" />
      <path d="M17.8 14.4a5.3 5.3 0 0 1 3.1 4.9" />
    </>
  ),
  project: (
    <>
      <path d="M12 3.3 3.5 7.7 12 12l8.5-4.3L12 3.3Z" />
      <path d="m3.5 12.3 8.5 4.3 8.5-4.3" />
      <path d="m3.5 16.7 8.5 4.3 8.5-4.3" />
    </>
  ),
  event: (
    <>
      <rect x="3.5" y="5.2" width="17" height="15.3" rx="2.2" />
      <path d="M8 3.5v3.2M16 3.5v3.2M3.5 10.6h17" />
    </>
  ),
  system: (
    <>
      <path d="M6.2 9.4a5.8 5.8 0 0 1 11.6 0c0 3.9 1.1 5.2 1.6 5.9H4.6c.5-.7 1.6-2 1.6-5.9Z" />
      <path d="M10 18.6a2 2 0 0 0 4 0" />
    </>
  ),
  check: <path d="m5 12.6 4.4 4.4L19 7.2" />,
  checkAll: (
    <>
      <path d="m2.8 12.4 3.9 3.9 6.9-6.9" />
      <path d="m10.4 16.3 1.6 1.6L21.6 8.3" />
    </>
  ),
  arrow: (
    <>
      <path d="M4.4 12h14.2" />
      <path d="m12.8 6.2 5.8 5.8-5.8 5.8" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19.6 12H5.4" />
      <path d="M11.2 6.2 5.4 12l5.8 5.8" />
    </>
  ),
  filter: <path d="M3.6 5.6h16.8l-6.6 7.5v5.3l-3.6 2v-7.3L3.6 5.6Z" />,
  caret: <path d="m8.2 10.4 3.8 3.8 3.8-3.8" />,
};

function Mark({ name, size = 16 }: { name: MarkName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {MARKS[name]}
    </svg>
  );
}

/* ── Derivation: family, label, title, body. All display only. ───────────── */

function familyOf(type: string): Family {
  // MOCK: the payload carries `type` but no taxonomy — the five marks are derived here.
  if (type.includes('join_request') || type.startsWith('material_request')) return 'request';
  if (type.startsWith('club_')) return 'club';
  if (type.startsWith('event_')) return 'event';
  if (type.startsWith('project_') || type === 'mentor_assigned' || type === 'material_added') {
    return 'project';
  }
  return 'system';
}

function stateOf(type: string): 'is-positive' | 'is-negative' | null {
  if (type.includes('rejected')) return 'is-negative';
  if (type.includes('approved')) return 'is-positive';
  return null;
}

function titleFor(n: NotificationItem): string {
  if (n.type === 'club_join_request' && (!n.title || n.title.includes('Join Request'))) {
    return 'New Club Join Request';
  }
  if (n.type === 'project_join_request' && (!n.title || n.title.includes('Join Request'))) {
    return 'New Project Join Request';
  }
  return n.title;
}

function bodyFor(n: NotificationItem): string {
  return (
    n.message ||
    (n.type === 'club_join_request'
      ? 'A student has requested to join this club.'
      : n.type === 'project_join_request'
        ? 'A student has requested to join this project.'
        : '')
  );
}

function kindFor(n: NotificationItem): string {
  if (n.title.toLowerCase().includes('feedback')) return 'Mentor feedback';
  switch (n.type) {
    case 'material_request_submitted':
    case 'material_request_created':
    case 'material_request':
      return 'Material request';
    case 'material_request_approved':
      return 'Material approved';
    case 'material_request_rejected':
      return 'Material rejected';
    case 'material_added':
    case 'project_material_added':
      return 'Material added';
    case 'club_join_request':
    case 'project_join_request':
      return 'Join request';
    case 'club_join_approved':
    case 'project_join_approved':
      return 'Request approved';
    case 'club_join_rejected':
    case 'project_join_rejected':
      return 'Request rejected';
    case 'mentor_assigned':
      return 'Mentorship';
    case 'event_created':
      return 'New event';
    case 'event_reminder':
      return 'Event reminder';
    case 'project_update':
      return 'Project update';
    default:
      return n.type
        .split('_')
        .join(' ')
        .replace(/^./, (c) => c.toUpperCase());
  }
}

/* ── Time: day buckets and a quiet relative label. ───────────────────────── */

const DAY_MS = 86400000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

type Bucket = 'today' | 'yesterday' | 'earlier';

function bucketOf(iso: string): Bucket {
  const at = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (at >= today) return 'today';
  if (at >= today - DAY_MS) return 'yesterday';
  return 'earlier';
}

const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

function relativeLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  const bucket = bucketOf(iso);
  if (bucket === 'today') return `${Math.floor(diff / 3600000)}h`;
  if (bucket === 'yesterday') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceLabel(source: string): string {
  if (source === 'self_purchased') return 'Self-purchased';
  if (source === 'owned') return 'Owned';
  return source;
}

/**
 * The message and the quoted reason/feedback are the same sentence in most payloads.
 * Split them once so the reading pane shows the context as prose and the mentor's or
 * reviewer's words as the quote, never the same line twice.
 */
function paneBody(n: NotificationItem): { lead: string; quotes: Array<{ label: string; text: string; negative: boolean }> } {
  const md = n.metadata || {};
  const quotes: Array<{ label: string; text: string; negative: boolean }> = [];
  if (md.feedbackText) quotes.push({ label: 'Feedback note', text: md.feedbackText, negative: false });
  if (md.reason) {
    quotes.push({
      label: n.type === 'material_request_rejected' ? 'Rejection reason' : 'Request reason',
      text: md.reason,
      negative: n.type === 'material_request_rejected',
    });
  }
  let lead = bodyFor(n);
  const first = quotes.find((q) => lead.includes(q.text));
  if (first) {
    const at = lead.indexOf(first.text);
    const rest = lead.slice(at + first.text.length).replace(/^["'”’.\s]+$/, '');
    if (at > 0 && rest.length === 0) {
      lead = lead
        .slice(0, at)
        .trim()
        .replace(/[:\s]["'“”‘’]$/, '')
        .trim()
        .replace(/[:\s]+$/, '')
        .replace(/\s+reason$/i, '')
        .replace(/[.:\s]+$/, '');
    }
  }
  return { lead, quotes };
}

export default function Notifications() {
  const navigate = useNavigate();
  const { setPageLoading } = usePageLoading();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [family, setFamily] = useState<'all' | Family>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readingOnNarrow, setReadingOnNarrow] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setPageLoading(true);
      setError(null);
      const res = await api<any>('GET', '/notifications');
      setNotifications(res.data || []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err?.message || 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    // MOCK: type and read-state filtering happen here — the endpoint takes no filter params.
    const byRead = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
    if (family === 'all') return byRead;
    return byRead.filter((n) => familyOf(n.type) === family);
  }, [notifications, filter, family]);

  const familiesPresent = useMemo(() => {
    const counts = new Map<Family, number>();
    notifications.forEach((n) => {
      const f = familyOf(n.type);
      counts.set(f, (counts.get(f) ?? 0) + 1);
    });
    return FAMILY_ORDER.filter((f) => counts.has(f)).map((f) => ({ family: f, count: counts.get(f) ?? 0 }));
  }, [notifications]);

  const groups = useMemo(() => {
    // MOCK: day buckets are derived from `createdAt`; the API returns a flat list.
    const buckets: Record<Bucket, NotificationItem[]> = { today: [], yesterday: [], earlier: [] };
    filteredNotifications.forEach((n) => buckets[bucketOf(n.createdAt)].push(n));
    return (['today', 'yesterday', 'earlier'] as Bucket[])
      .map((key) => ({ key, label: BUCKET_LABEL[key], items: buckets[key] }))
      .filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  const selected = useMemo(() => {
    return (
      filteredNotifications.find((n) => n._id === selectedId) ?? filteredNotifications[0] ?? null
    );
  }, [filteredNotifications, selectedId]);

  useEffect(() => {
    if (!typeMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setTypeMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTypeMenuOpen(false);
        filterBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [typeMenuOpen]);

  const markRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api('PATCH', `/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await api('PATCH', '/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleAction = async (n: NotificationItem) => {
    if (!n.isRead) {
      markRead(n._id);
    }
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.open(n.link, '_blank');
      } else {
        navigate(n.link);
      }
    }
  };

  const selectRow = (n: NotificationItem) => {
    setSelectedId(n._id);
    setReadingOnNarrow(true);
  };

  const resetFilters = () => {
    setFilter('all');
    setFamily('all');
    setReadingOnNarrow(false);
  };

  const total = notifications.length;
  const filtersActive = filter !== 'all' || family !== 'all';
  const bodyClass = !loading && selected ? (readingOnNarrow ? ' is-reading' : '') : ' is-solo';

  const factsFor = (n: NotificationItem): Array<[string, string]> => {
    const md = n.metadata || {};
    const facts: Array<[string, string]> = [];
    const materialType = n.type.startsWith('material_') || n.type.includes('material_added');
    if (md.projectName) facts.push(['Project', md.projectName]);
    if (md.clubName) facts.push(['Club', md.clubName]);
    if (md.entityName) facts.push([materialType ? 'Item' : 'Update', md.entityName]);
    if (md.quantity) facts.push(['Quantity', String(md.quantity)]);
    if (md.actorName) facts.push(['From', md.actorName]);
    if (md.actorEmail) facts.push(['Email', md.actorEmail]);
    if (md.department) facts.push(['Department', md.department]);
    if (md.semester) facts.push(['Semester', String(md.semester)]);
    if (md.status) facts.push(['Status', md.status.charAt(0).toUpperCase() + md.status.slice(1)]);
    if (md.source) facts.push(['Source', sourceLabel(md.source)]);
    if (md.hasAttachments) facts.push(['Attachments', String(md.attachmentCount || 1)]);
    if (md.requestDate) facts.push(['Requested', exactTime(md.requestDate)]);
    if (md.submissionTime) facts.push(['Submitted', exactTime(md.submissionTime)]);
    if (md.creationTime) facts.push(['Added', exactTime(md.creationTime)]);
    return facts;
  };

  const pane = selected ? paneBody(selected) : { lead: '', quotes: [] };
  const facts = selected ? factsFor(selected) : [];

  return (
    <div className="ntf">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <div className="ntf-headline">
            <h1 className="ui-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="ui-count ui-count--accent">
                {unreadCount}
                <span className="ui-visually-hidden"> unread</span>
              </span>
            )}
          </div>
          <p className="ui-sub">
            {total === 0
              ? 'Updates about your clubs, projects, events and material requests arrive here.'
              : unreadCount > 0
                ? `${total} in your inbox · ${unreadCount} unread`
                : `${total} in your inbox · all read`}
          </p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn ui-btn--quiet ui-btn--sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
          >
            <Mark name="checkAll" size={14} />
            {markingAll ? 'Marking all read' : 'Mark all read'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="ntf-error">
          <div className="ui-notice ui-notice--error" role="alert">
            <span>{error}</span>
          </div>
          <div className="ntf-error__actions">
            <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={fetchNotifications}>
              Try again
            </button>
          </div>
        </div>
      ) : (
        <section className="ui-panel ntf-inbox" aria-label="Notification inbox">
          <div className="ntf-tools">
            <div className="ui-seg" role="group" aria-label="Filter by read state">
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All
                <span className="ntf-seg-count">{total}</span>
              </button>
              <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
                Unread
                <span className="ntf-seg-count">{unreadCount}</span>
              </button>
            </div>

            <div className="ntf-filter" ref={filterRef}>
              <button
                type="button"
                ref={filterBtnRef}
                className="ui-btn ui-btn--quiet ui-btn--sm"
                aria-haspopup="menu"
                aria-expanded={typeMenuOpen}
                onClick={() => setTypeMenuOpen((open) => !open)}
              >
                <Mark name="filter" size={13} />
                {family === 'all' ? 'All types' : FAMILY_LABEL[family]}
                <Mark name="caret" size={13} />
              </button>
              {typeMenuOpen && (
                <div className="ui-menu ntf-menu" role="menu" aria-label="Filter by type">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={family === 'all'}
                    className="ui-menu__item"
                    onClick={() => {
                      setFamily('all');
                      setTypeMenuOpen(false);
                    }}
                  >
                    <span className="ntf-menu__tick" aria-hidden="true">
                      <Mark name="check" size={13} />
                    </span>
                    All types
                    <span className="ntf-menu__count">{total}</span>
                  </button>
                  {familiesPresent.map(({ family: f, count }) => (
                    <button
                      key={f}
                      type="button"
                      role="menuitemradio"
                      aria-checked={family === f}
                      className="ui-menu__item"
                      onClick={() => {
                        setFamily(f);
                        setTypeMenuOpen(false);
                      }}
                    >
                      <span className="ntf-menu__tick" aria-hidden="true">
                        <Mark name="check" size={13} />
                      </span>
                      {FAMILY_LABEL[f]}
                      <span className="ntf-menu__count">{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`ntf-body${bodyClass}`}>
            <div className="ntf-column">
              {loading ? (
                <>
                  <p className="ui-visually-hidden">Loading notifications</p>
                  <div className="ntf-skel" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="ntf-skel__row">
                        <span className="ui-skel ntf-skel__mark" />
                        <span className="ntf-skel__lines">
                          <span className="ui-skel ntf-skel__title" />
                          <span className="ui-skel ntf-skel__body" />
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : filteredNotifications.length === 0 ? (
                <div className="ui-empty ntf-empty">
                  <span className="ui-empty__mark">
                    <Mark name="check" size={15} />
                  </span>
                  <p className="ui-empty__title">You&rsquo;re all caught up</p>
                  <p className="ui-empty__text">
                    {total === 0
                      ? 'Nothing has arrived yet. Updates about your clubs, projects, events and material requests will appear here.'
                      : filter === 'unread'
                        ? total === 1
                          ? 'Your only notification is read.'
                          : `All ${total} notifications are read.`
                        : `${total} notifications are in the inbox, none filed under ${
                            family === 'all' ? 'this type' : FAMILY_LABEL[family].toLowerCase()
                          }.`}
                  </p>
                  <div className="ntf-empty__actions">
                    {total > 0 && filtersActive && (
                      <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={resetFilters}>
                        Show all notifications
                      </button>
                    )}
                    <Link className="ui-btn ui-btn--sm" to="/dashboard">
                      Back to dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="ntf-list">
                  {groups.map((group) => (
                    <li key={group.key} className="ntf-group">
                      <h2 className="ntf-day">
                        <span>{group.label}</span>
                        <span className="ntf-day__count">{group.items.length}</span>
                      </h2>
                      <ul>
                        {group.items.map((n) => {
                          const fam = familyOf(n.type);
                          const state = stateOf(n.type);
                          const isSelected = selected?._id === n._id;
                          return (
                            <li
                              key={n._id}
                              className={`ntf-row${n.isRead ? '' : ' is-unread'}${
                                isSelected ? ' is-selected' : ''
                              }`}
                            >
                              <button
                                type="button"
                                className="ntf-row__hit"
                                aria-current={isSelected ? 'true' : undefined}
                                onClick={() => selectRow(n)}
                              >
                                <span className="ntf-row__flag" aria-hidden="true" />
                                <span className={`ntf-mark${state ? ` ${state}` : ''}`} aria-hidden="true">
                                  <Mark name={fam} />
                                </span>
                                <span className="ntf-row__text">
                                  <span className="ntf-row__title">
                                    <span className="ui-visually-hidden">
                                      {n.isRead ? 'Read: ' : 'Unread: '}
                                    </span>
                                    {titleFor(n)}
                                  </span>
                                  <span className="ntf-row__body">{paneBody(n).lead}</span>
                                </span>
                              </button>
                              <span className="ntf-row__aside">
                                <span className="ntf-row__time" title={exactTime(n.createdAt)}>
                                  {relativeLabel(n.createdAt)}
                                </span>
                                <span className="ntf-row__tools">
                                  {!n.isRead && (
                                    <button
                                      type="button"
                                      className="ntf-tool"
                                      aria-label={`Mark "${titleFor(n)}" as read`}
                                      title="Mark as read"
                                      onClick={(e) => markRead(n._id, e)}
                                    >
                                      <Mark name="check" size={14} />
                                    </button>
                                  )}
                                  {n.link && (
                                    <button
                                      type="button"
                                      className="ntf-tool"
                                      aria-label={`Open "${titleFor(n)}"`}
                                      title={n.actionText || 'Open'}
                                      onClick={() => handleAction(n)}
                                    >
                                      <Mark name="arrow" size={14} />
                                    </button>
                                  )}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected && !loading && (
              <aside className="ntf-pane" aria-label="Selected notification">
                <article className="ntf-pane__inner">
                  <button
                    type="button"
                    className="ntf-back"
                    onClick={() => setReadingOnNarrow(false)}
                  >
                    <Mark name="arrowLeft" size={14} />
                    Inbox
                  </button>

                  <header className="ntf-pane__head">
                    <span
                      className={`ntf-mark ntf-mark--lg${
                        stateOf(selected.type) ? ` ${stateOf(selected.type)}` : ''
                      }`}
                      aria-hidden="true"
                    >
                      <Mark name={familyOf(selected.type)} size={19} />
                    </span>
                    <div className="ntf-pane__ident">
                      <p className="ntf-pane__kind">
                        <span>{kindFor(selected)}</span>
                        <span className="ntf-sep" aria-hidden="true" />
                        <span>{exactTime(selected.createdAt)}</span>
                      </p>
                      <h2 className="ntf-pane__title">{titleFor(selected)}</h2>
                    </div>
                    <span className={`ui-tag${selected.isRead ? ' ui-tag--plain' : ' is-accent'}`}>
                      {selected.isRead ? 'Read' : 'Unread'}
                    </span>
                  </header>

                  {pane.lead && <p className="ntf-pane__message">{pane.lead}</p>}

                  {pane.quotes.map((quote) => (
                    <blockquote key={quote.label} className={`ntf-quote${quote.negative ? ' is-negative' : ''}`}>
                      <p className="ntf-quote__label">{quote.label}</p>
                      <p className="ntf-quote__text">&ldquo;{quote.text}&rdquo;</p>
                    </blockquote>
                  ))}

                  {facts.length > 0 && (
                    <dl className="ntf-facts">
                      {facts.map(([label, value]) => (
                        <div key={label} className="ntf-facts__pair">
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {(selected.link || !selected.isRead) && (
                    <footer className="ntf-pane__foot">
                      {selected.link ? (
                        <button
                          type="button"
                          className="ui-btn ui-btn--primary ui-btn--sm"
                          onClick={() => handleAction(selected)}
                        >
                          {selected.actionText || 'Open'}
                          <Mark name="arrow" size={14} />
                        </button>
                      ) : null}
                      {!selected.isRead && (
                        <button
                          type="button"
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                          onClick={() => markRead(selected._id)}
                        >
                          <Mark name="check" size={14} />
                          Mark as read
                        </button>
                      )}
                    </footer>
                  )}
                </article>
              </aside>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
