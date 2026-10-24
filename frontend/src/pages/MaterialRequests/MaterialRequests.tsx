import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { usePageLoading } from '../../context/LoadingContext';
import '../Inventory/ops.css';

interface RequestUser {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  semester?: number | null;
}

interface MaterialRequest {
  _id: string;
  materialName?: string;
  specifications?: string;
  quantity: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: RequestUser | null;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string | null;
  documentUrl?: string | null;
  documentOriginalName?: string | null;
  projectId?: { _id?: string; name?: string; status?: string } | null;
  requestedBy?: RequestUser | null;
  inventoryItemId?: {
    _id?: string;
    name?: string;
    category?: string;
    availableQuantity?: number;
    totalQuantity?: number;
    location?: string;
  } | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_META: Record<MaterialRequest['status'], { label: string; tag: string }> = {
  pending: { label: 'Pending', tag: 'is-warning' },
  approved: { label: 'Approved', tag: 'is-positive' },
  rejected: { label: 'Rejected', tag: 'is-negative' },
};

const itemNameOf = (request: MaterialRequest) =>
  request.materialName || request.inventoryItemId?.name || 'Unlisted item';

const formatDay = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    : 'Unknown';

const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';

const formatStamp = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const waitingLabel = (value?: string) => {
  if (!value) return 'None';
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60 * 60 * 1000) return 'under 1h';
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / (60 * 60 * 1000))}h`;
  return `${Math.floor(elapsed / (24 * 60 * 60 * 1000))}d`;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M20 11a8 8 0 1 0-2.3 6.3" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
      <path d="M5 5h14l1 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5l1-8Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

interface QueueRowProps {
  request: MaterialRequest;
  onOpen: (request: MaterialRequest) => void;
  onApprove: (request: MaterialRequest) => void;
  onReject: (request: MaterialRequest) => void;
  busy: boolean;
}

function QueueRow({ request, onOpen, onApprove, onReject, busy }: QueueRowProps) {
  const item = itemNameOf(request);
  const project = request.projectId?.name || 'Unknown project';
  const requester = request.requestedBy;
  const available = request.inventoryItemId?.availableQuantity;
  const short = available != null && request.quantity > available;
  const status = STATUS_META[request.status];
  const pending = request.status === 'pending';
  const subLine = request.reason?.trim()
    || request.specifications?.trim()
    || (request.status === 'rejected' && request.rejectionReason
      ? `Rejected: ${request.rejectionReason}`
      : 'No reason recorded');

  return (
    <li className="ops-queue__row">
      <button
        type="button"
        className="ops-queue__open"
        aria-label={`Open request for ${request.quantity} of ${item} from ${requester?.name || 'unknown requester'}`}
        onClick={() => onOpen(request)}
      />

      <div className="ops-queue__cell">
        <div className="ops-queue__intro">
          <span className="ops-queue__name">{item}</span>
          {request.inventoryItemId?.category && (
            <span className="ui-tag ui-tag--plain">{request.inventoryItemId.category}</span>
          )}
        </div>
        <p className="ops-queue__sub" title={subLine}>{subLine}</p>
        <p className="ops-queue__mobile">
          <span>{requester?.name || 'Unknown requester'}</span>
          <span className="ops-queue__meta-inline">
            <span>{project}</span>
            <span>{request.quantity} requested</span>
            <span>{formatDay(request.createdAt)}</span>
          </span>
        </p>
      </div>

      <div className="ops-queue__cell ops-queue__project">
        <p className="ops-queue__project">{project}</p>
        {request.projectId?.status && request.projectId.status !== 'active' && (
          <p className="ops-queue__project-sub">Project {request.projectId.status}</p>
        )}
      </div>

      <div className="ops-queue__cell ops-queue__requester">
        <div
          className="ops-person"
          title={[requester?.email, requester?.department].filter(Boolean).join(' · ')}
        >
          <span className="ui-avatar ui-avatar--sm" aria-hidden="true">{initialsOf(requester?.name)}</span>
          <div className="ops-person__text">
            <p className="ops-person__name">{requester?.name || 'Unknown requester'}</p>
            <p className="ops-person__sub">
              {[requester?.department, requester?.semester ? `Sem ${requester.semester}` : null]
                .filter(Boolean)
                .join(' · ') || 'No department on file'}
            </p>
          </div>
        </div>
      </div>

      <div className="ops-queue__cell ops-queue__qty">
        <div className="ops-qty">
          <span className="ops-qty__now">{request.quantity}</span>
        </div>
        <p className={`ops-queue__avail ${short ? 'ops-queue__avail--short' : ''}`}>
          {available == null ? 'stock unknown' : short ? `short by ${request.quantity - available}` : `${available} in stock`}
        </p>
      </div>

      <div className="ops-queue__cell ops-queue__date">
        {formatDay(request.createdAt)}
        <br />
        {formatTime(request.createdAt)}
      </div>

      <div className="ops-queue__cell ops-queue__status">
        <span className={`ui-tag ${status.tag}`}>{status.label}</span>
      </div>

      <div className="ops-queue__actions">
        {pending ? (
          <>
            <button
              type="button"
              className="ui-btn ui-btn--quiet ui-btn--sm"
              onClick={() => onReject(request)}
              disabled={busy}
            >
              Reject
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--sm"
              onClick={() => onApprove(request)}
              disabled={busy}
            >
              {busy ? 'Approving…' : 'Approve'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn--quiet ui-btn--sm"
            onClick={() => onOpen(request)}
          >
            View
          </button>
        )}
      </div>
    </li>
  );
}

const isPending = (request: MaterialRequest) => request.status === 'pending';

export default function MaterialRequests() {
  const { setPageLoading } = usePageLoading();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const [detail, setDetail] = useState<MaterialRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<MaterialRequest | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MaterialRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const focusReturn = useRef<HTMLElement | null>(null);

  const loadRequests = async () => {
    try {
      setPageLoading(true);
      setLoadError(null);
      const res = await api<any>('GET', '/material-requests');
      setRequests(res.data || []);
    } catch (e: any) {
      console.error(e);
      setLoadError(e.message || 'Failed to load material requests');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const rememberFocus = () => {
    focusReturn.current = document.activeElement as HTMLElement | null;
  };
  const restoreFocus = () => {
    window.requestAnimationFrame(() => focusReturn.current?.focus());
  };

  const openDetail = (request: MaterialRequest) => {
    rememberFocus();
    setDetail(request);
  };

  const closeDetail = () => {
    setDetail(null);
    restoreFocus();
  };

  const openApprove = (request: MaterialRequest) => {
    rememberFocus();
    setApproveTarget(request);
    setApproveError(null);
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApproveError(null);
    restoreFocus();
  };

  const openReject = (request: MaterialRequest) => {
    rememberFocus();
    setRejectTarget(request);
    setRejectReason('');
    setRejectError(null);
  };

  const closeReject = () => {
    setRejectTarget(null);
    setRejectReason('');
    setRejectError(null);
    restoreFocus();
  };

  const handleApprove = async (req: MaterialRequest): Promise<boolean> => {
    const itemName = req.materialName || req.inventoryItemId?.name || 'Item';

    try {
      setActionLoading(req._id);
      setAlertMsg(null);
      setApproveError(null);
      await api('PATCH', `/material-requests/${req._id}/approve`);
      setDetail(null);
      setAlertMsg({ type: 'success', message: `Successfully approved request for ${req.quantity}x "${itemName}".` });
      await loadRequests();
      return true;
    } catch (e: any) {
      const message = e.message || 'Failed to approve request';
      setApproveError(message);
      setAlertMsg({ type: 'error', message });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;

    try {
      setActionLoading(rejectTarget._id);
      setAlertMsg(null);
      setRejectError(null);
      await api('PATCH', `/material-requests/${rejectTarget._id}/reject`, { rejectionReason: rejectReason.trim() });
      setRejectTarget(null);
      setRejectReason('');
      setDetail(null);
      setAlertMsg({ type: 'success', message: 'Material request rejected.' });
      await loadRequests();
      restoreFocus();
    } catch (e: any) {
      const message = e.message || 'Failed to reject request';
      setRejectError(message);
      setAlertMsg({ type: 'error', message });
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    const target = approveTarget;
    const ok = await handleApprove(target);
    if (ok) {
      setApproveTarget(null);
      setApproveError(null);
      restoreFocus();
    }
  };

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter(isPending).length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests],
  );

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    requests.forEach((request) => {
      if (request.projectId?._id && request.projectId.name) {
        seen.set(request.projectId._id, request.projectId.name);
      }
    });
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const visible = useMemo(() => {
    // MOCK: status, project and text filters run client-side; GET /material-requests returns every request.
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (projectFilter !== 'all' && request.projectId?._id !== projectFilter) return false;
      if (!needle) return true;
      return [
        itemNameOf(request),
        request.projectId?.name,
        request.requestedBy?.name,
        request.requestedBy?.email,
        request.reason,
        request.specifications,
        request.rejectionReason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [requests, query, projectFilter]);

  const pendingRequests = useMemo(
    () =>
      visible
        .filter(isPending)
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
    [visible],
  );

  const resolvedRequests = useMemo(
    () =>
      visible
        .filter((request) => !isPending(request))
        .sort((a, b) => new Date(b.reviewedAt || b.createdAt || 0).getTime() - new Date(a.reviewedAt || a.createdAt || 0).getTime()),
    [visible],
  );

  const resolvedForFilter = useMemo(() => {
    if (filter === 'approved') return resolvedRequests.filter((r) => r.status === 'approved');
    if (filter === 'rejected') return resolvedRequests.filter((r) => r.status === 'rejected');
    return resolvedRequests;
  }, [resolvedRequests, filter]);

  const stats = useMemo(() => {
    const pending = requests.filter(isPending);
    const units = pending.reduce((sum, request) => sum + (request.quantity || 0), 0);
    const oldest = pending.reduce<string | undefined>((value, request) => {
      if (!request.createdAt) return value;
      if (!value) return request.createdAt;
      return new Date(request.createdAt) < new Date(value) ? request.createdAt : value;
    }, undefined);
    return {
      pending: pending.length,
      units,
      oldest,
      resolved: counts.approved + counts.rejected,
    };
  }, [requests, counts]);

  const showPending = filter === 'all' || filter === 'pending';
  const showResolvedSection = filter === 'all' || filter === 'approved' || filter === 'rejected';
  const isCollapsible = filter === 'all';
  const renderResolvedSection =
    (filter === 'approved' || filter === 'rejected') || resolvedRequests.length > 0;

  const filterLabel =
    filter === 'approved' ? 'Approved' : filter === 'rejected' ? 'Rejected' : 'Resolved';

  const hasSearch = query.trim().length > 0 || projectFilter !== 'all';

  const shownCount =
    filter === 'pending'
      ? pendingRequests.length
      : filter === 'approved' || filter === 'rejected'
        ? resolvedForFilter.length
        : pendingRequests.length + resolvedForFilter.length;

  const resetFilters = () => {
    setQuery('');
    setProjectFilter('all');
  };

  useEffect(() => {
    const overlayOpen = !!detail || !!approveTarget || !!rejectTarget;
    if (!overlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (rejectTarget) closeReject();
      else if (approveTarget) closeApprove();
      else closeDetail();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detail, approveTarget, rejectTarget]);

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>, close: () => void) => {
    if (event.target === event.currentTarget) close();
  };

  const approveStock = approveTarget?.inventoryItemId?.availableQuantity ?? 0;
  const approveShort = !!approveTarget && approveTarget.quantity > approveStock;

  return (
    <div className="ops-page">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Material requests</h1>
          <p className="ui-sub">
            Component requests from project team leaders, queued for a decision.
          </p>
        </div>
        <div className="ui-page-actions ops-head-tools">
          <div className="ui-search ops-search">
            <SearchIcon />
            <label className="ui-visually-hidden" htmlFor="ops-request-search">Search requests</label>
            <input
              id="ops-request-search"
              className="ui-field"
              type="search"
              placeholder="Search requests"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          {projects.length > 1 && (
            <div className="ops-select ops-filter">
              <label className="ui-visually-hidden" htmlFor="ops-request-project">Filter by project</label>
              <select
                id="ops-request-project"
                className="ui-field ui-field--select"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          )}
        </div>
      </header>

      <div className="ops-body">
        {alertMsg && (
          <div
            className={`ui-notice ${alertMsg.type === 'success' ? 'ops-notice--success' : 'ui-notice--error'}`}
            role="status"
          >
            <div className="ui-grow">{alertMsg.message}</div>
            <button
              type="button"
              className="ui-icon-btn"
              aria-label="Dismiss message"
              onClick={() => setAlertMsg(null)}
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {loadError && (
          <div className="ui-notice ui-notice--error" role="alert">
            <div className="ui-grow">
              <p>Material requests could not be loaded.</p>
              <p className="ops-note">{loadError}</p>
            </div>
            <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={loadRequests}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="ui-stack ui-stack--lg" aria-busy="true">
            <div className="ops-skel-stats" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <div className="ops-skel-stat" key={n}>
                  <div className="ui-skel ops-skel-line ops-skel-line--value" />
                  <div className="ui-skel ops-skel-line ops-skel-line--sm" />
                </div>
              ))}
            </div>
            <div className="ops-skel-toolbar" aria-hidden="true">
              <div className="ui-skel ops-skel-line ops-skel-line--head" />
              <div className="ui-skel ops-skel-line ops-skel-line--head" />
            </div>
            <div className="ui-panel">
              <header className="ui-panel__head">
                <div className="ui-skel ops-skel-line ops-skel-line--head" />
              </header>
              <div className="ops-skel-rows" aria-hidden="true">
                {[0, 1, 2].map((n) => (
                  <div className="ops-skel-row" key={n}>
                    <div>
                      <div className="ui-skel ops-skel-line" />
                      <div className="ui-skel ops-skel-line ops-skel-line--sm" />
                    </div>
                    <div className="ui-skel ops-skel-line ops-skel-line--wide" />
                    <div className="ui-skel ops-skel-line" />
                    <div className="ui-skel ops-skel-line ops-skel-line--wide" />
                  </div>
                ))}
              </div>
            </div>
            <span className="ui-visually-hidden" role="status">Loading material requests</span>
          </div>
        ) : requests.length === 0 && !loadError ? (
          <div className="ui-empty">
            <span className="ui-empty__mark"><InboxIcon /></span>
            <p className="ui-empty__title">No material requests</p>
            <p className="ui-empty__text">
              When a project team leader requests a component from the store room, it arrives here for review.
            </p>
            <Link className="ui-btn ui-btn--quiet ui-btn--sm" to="/inventory">
              Open inventory
            </Link>
          </div>
        ) : requests.length > 0 ? (
          <>
            <div className="ui-stats">
              <div className="ui-stat ui-stat--accent">
                <div className="ui-stat__value">{stats.pending}</div>
                <div className="ui-stat__label">
                  <span className="ops-live">
                    <span className="ops-live__dot" aria-hidden="true" />
                    Pending review
                  </span>
                </div>
                <div className="ops-stat-foot">needs a decision</div>
              </div>
              <div className="ui-stat">
                <div className="ui-stat__value">{stats.units}</div>
                <div className="ui-stat__label">Units requested</div>
                <div className="ops-stat-foot">across pending requests</div>
              </div>
              <div className="ui-stat">
                <div className="ui-stat__value">{stats.pending ? waitingLabel(stats.oldest) : 'None'}</div>
                <div className="ui-stat__label">Oldest waiting</div>
                <div className="ops-stat-foot">since submission</div>
              </div>
              <div className="ui-stat">
                <div className="ui-stat__value">{stats.resolved}</div>
                <div className="ui-stat__label">Resolved</div>
                <div className="ops-stat-foot">
                  {counts.approved} approved · {counts.rejected} rejected
                </div>
              </div>
            </div>

            <div className="ops-toolbar">
              <div className="ui-seg" role="group" aria-label="Filter requests by status">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => {
                      setFilter(key);
                      if (key === 'all') setShowResolved(false);
                    }}
                  >
                    {key !== 'all' && (
                      <span className={`ops-seg__dot ops-seg__dot--${key}`} aria-hidden="true" />
                    )}
                    {key === 'all' ? 'All' : STATUS_META[key].label}
                    <span className={`ops-seg__n ${filter === key ? 'ops-seg__n--on' : ''}`}>
                      {counts[key]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="ops-toolbar__right">
                {hasSearch && (
                  <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={resetFilters}>
                    Clear filters
                  </button>
                )}
                <span className="ops-toolbar__note">
                  {shownCount} of {requests.length} requests
                </span>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="ui-empty">
                <span className="ui-empty__mark"><SearchIcon /></span>
                <p className="ui-empty__title">No requests match</p>
                <p className="ui-empty__text">Nothing matches that search or project filter.</p>
                <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {showPending && (
                  <section className="ui-panel ui-panel--accent">
                    <header className="ui-panel__head">
                      <div className="ui-panel__titles">
                        <h2 className="ui-panel__title">Needs review</h2>
                        <span className="ui-panel__meta">
                          {pendingRequests.length} awaiting
                          {pendingRequests.length > 0 ? ' · oldest first' : ''}
                        </span>
                      </div>
                      <div className="ops-panel-tools">
                        <button
                          type="button"
                          className="ui-icon-btn"
                          aria-label="Refresh requests"
                          title="Refresh"
                          onClick={refresh}
                          disabled={refreshing}
                        >
                          <RefreshIcon />
                        </button>
                      </div>
                    </header>

                    {pendingRequests.length > 0 ? (
                      <ul className="ops-queue">
                        {pendingRequests.map((request) => (
                          <QueueRow
                            key={request._id}
                            request={request}
                            onOpen={openDetail}
                            onApprove={openApprove}
                            onReject={openReject}
                            busy={actionLoading === request._id}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="ops-empty-wrap">
                        <div className="ui-empty">
                          <span className="ui-empty__mark"><InboxIcon /></span>
                          <p className="ui-empty__title">No pending requests</p>
                          <p className="ui-empty__text">
                            {counts.pending > 0
                              ? 'No pending requests match the current filters.'
                              : 'Every request submitted by team leaders has been reviewed.'}
                          </p>
                          {counts.pending > 0 && hasSearch ? (
                            <button
                              type="button"
                              className="ui-btn ui-btn--quiet ui-btn--sm"
                              onClick={resetFilters}
                            >
                              Clear filters
                            </button>
                          ) : counts.all > 0 && filter === 'pending' ? (
                            <button
                              type="button"
                              className="ui-btn ui-btn--quiet ui-btn--sm"
                              onClick={() => setFilter('all')}
                            >
                              See resolved requests
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {showResolvedSection && renderResolvedSection && (
                  <section className="ui-panel">
                    {isCollapsible ? (
                      <button
                        type="button"
                        className="ops-disclosure"
                        aria-expanded={showResolved}
                        onClick={() => setShowResolved((open) => !open)}
                      >
                        <span>Resolved</span>
                        <span className="ops-disclosure__n">{resolvedRequests.length}</span>
                        <span className="ops-disclosure__mark"><ChevronIcon /></span>
                      </button>
                    ) : (
                      <header className="ui-panel__head">
                        <div className="ui-panel__titles">
                          <h2 className="ui-panel__title">{filterLabel}</h2>
                          <span className="ui-panel__meta">{resolvedForFilter.length}</span>
                        </div>
                        <div className="ops-panel-tools">
                          <button
                            type="button"
                            className="ui-icon-btn"
                            aria-label="Refresh requests"
                            title="Refresh"
                            onClick={refresh}
                            disabled={refreshing}
                          >
                            <RefreshIcon />
                          </button>
                        </div>
                      </header>
                    )}

                    {(!isCollapsible || showResolved) && (
                      resolvedForFilter.length > 0 ? (
                        <ul className="ops-queue ops-queue--resolved">
                          {resolvedForFilter.map((request) => (
                            <QueueRow
                              key={request._id}
                              request={request}
                              onOpen={openDetail}
                              onApprove={openApprove}
                              onReject={openReject}
                              busy={actionLoading === request._id}
                            />
                          ))}
                        </ul>
                      ) : (
                        <div className="ops-empty-wrap">
                          <div className="ui-empty">
                            <span className="ui-empty__mark"><InboxIcon /></span>
                            <p className="ui-empty__title">No {filter === 'approved' ? 'approved' : 'rejected'} requests</p>
                            <p className="ui-empty__text">
                              {(filter === 'approved' ? counts.approved : counts.rejected) > 0 && hasSearch
                                ? `No ${filter === 'approved' ? 'approved' : 'rejected'} requests match the current filters.`
                                : filter === 'approved'
                                  ? 'Approved requests will collect here once stock is allocated.'
                                  : 'Rejected requests and their reasons will collect here.'}
                            </p>
                            {(filter === 'approved' ? counts.approved : counts.rejected) > 0 && hasSearch && (
                              <button
                                type="button"
                                className="ui-btn ui-btn--quiet ui-btn--sm"
                                onClick={resetFilters}
                              >
                                Clear filters
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </section>
                )}
              </>
            )}
          </>
        ) : null}
      </div>

      {detail && (
        <div className="ui-overlay ops-overlay--drawer" onMouseDown={(event) => closeOnBackdrop(event, closeDetail)}>
          <aside
            className="ops-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-request-title"
          >
            <header className="ui-modal__head">
              <div className="ui-grow">
                <div className="ops-detail__head">
                  <span className={`ui-tag ${STATUS_META[detail.status].tag}`}>
                    {STATUS_META[detail.status].label}
                  </span>
                  <span className="ops-note">Requested {formatStamp(detail.createdAt)}</span>
                </div>
                <h2 className="ops-drawer__title" id="ops-request-title">
                  {detail.quantity} × {itemNameOf(detail)}
                </h2>
                <p className="ops-modal__sub">{detail.projectId?.name || 'Unknown project'}</p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close request" onClick={closeDetail} autoFocus>
                <CloseIcon />
              </button>
            </header>

            <div className="ops-drawer__body">
              <dl className="ops-facts">
                <div>
                  <dt className="ops-fact__label">Requested by</dt>
                  <dd
                    className="ops-fact__value"
                    title={[detail.requestedBy?.email, detail.requestedBy?.department].filter(Boolean).join(' · ')}
                  >
                    {detail.requestedBy?.name || 'Unknown requester'}
                  </dd>
                </div>
                <div>
                  <dt className="ops-fact__label">Project</dt>
                  <dd className="ops-fact__value">{detail.projectId?.name || 'Unknown project'}</dd>
                </div>
                <div>
                  <dt className="ops-fact__label">Quantity</dt>
                  <dd className="ops-fact__value ops-fact__value--num">{detail.quantity}</dd>
                </div>
                <div>
                  <dt className="ops-fact__label">Available now</dt>
                  <dd className="ops-fact__value">
                    {detail.inventoryItemId?.availableQuantity != null
                      ? `${detail.inventoryItemId.availableQuantity} of ${detail.inventoryItemId.totalQuantity ?? 'unknown'}`
                      : 'Stock no longer listed'}
                  </dd>
                </div>
                <div>
                  <dt className="ops-fact__label">Category</dt>
                  <dd className="ops-fact__value">{detail.inventoryItemId?.category || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="ops-fact__label">Location</dt>
                  <dd className="ops-fact__value">{detail.inventoryItemId?.location || 'Not set'}</dd>
                </div>
              </dl>

              <section aria-labelledby="ops-detail-spec">
                <h3 className="ops-section-label" id="ops-detail-spec">Specifications</h3>
                {detail.specifications?.trim() ? (
                  <p className="ops-quote">{detail.specifications}</p>
                ) : (
                  <p className="ops-note">No specifications were recorded.</p>
                )}
              </section>

              <section aria-labelledby="ops-detail-reason">
                <h3 className="ops-section-label" id="ops-detail-reason">Reason for request</h3>
                {detail.reason?.trim() ? (
                  <p className="ops-quote">{detail.reason}</p>
                ) : (
                  <p className="ops-note">The team leader did not add a reason.</p>
                )}
              </section>

              {(detail.imageUrl || detail.documentUrl) && (
                <section aria-labelledby="ops-detail-files">
                  <h3 className="ops-section-label" id="ops-detail-files">Attachments</h3>
                  <div className="ops-attach">
                    {detail.imageUrl && (
                      <a
                        className="ops-attach__link"
                        href={detail.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img className="ops-attach__thumb" src={detail.imageUrl} alt="Component reference" />
                        <span>Component photo</span>
                      </a>
                    )}
                    {detail.documentUrl && (
                      <a
                        className="ops-attach__link"
                        href={detail.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <DocumentIcon />
                        <span>
                          {detail.documentOriginalName
                            ? detail.documentOriginalName
                            : 'Reference document'}
                        </span>
                      </a>
                    )}
                  </div>
                </section>
              )}

              {detail.status === 'rejected' && detail.rejectionReason && (
                <section aria-labelledby="ops-detail-rejection">
                  <h3 className="ops-section-label" id="ops-detail-rejection">Rejection reason</h3>
                  <p className="ops-quote ops-quote--negative">{detail.rejectionReason}</p>
                </section>
              )}

              <section aria-labelledby="ops-detail-timeline">
                <h3 className="ops-section-label" id="ops-detail-timeline">History</h3>
                <ol className="ops-timeline">
                  <li className="ops-timeline__step ops-timeline__step--done">
                    <span className="ops-timeline__dot" aria-hidden="true" />
                    <div>
                      <p className="ops-timeline__title">Submitted</p>
                      <p className="ops-timeline__sub">
                        {formatStamp(detail.createdAt)}
                        {detail.requestedBy?.name ? ` · ${detail.requestedBy.name}` : ''}
                      </p>
                    </div>
                  </li>
                  {detail.status === 'pending' ? (
                    <li className="ops-timeline__step">
                      <span className="ops-timeline__dot" aria-hidden="true" />
                      <div>
                        <p className="ops-timeline__title">Awaiting review</p>
                        <p className="ops-timeline__sub">With the project admin</p>
                      </div>
                    </li>
                  ) : (
                    <li
                      className={`ops-timeline__step ops-timeline__step--done ${
                        detail.status === 'approved'
                          ? 'ops-timeline__step--positive'
                          : 'ops-timeline__step--negative'
                      }`}
                    >
                      <span className="ops-timeline__dot" aria-hidden="true" />
                      <div>
                        <p className="ops-timeline__title">
                          {detail.status === 'approved' ? 'Approved and allocated' : 'Rejected'}
                        </p>
                        <p className="ops-timeline__sub">
                          {formatStamp(detail.reviewedAt)}
                          {detail.reviewedBy?.name ? ` · ${detail.reviewedBy.name}` : ''}
                        </p>
                      </div>
                    </li>
                  )}
                </ol>
              </section>
            </div>

            <footer className="ui-modal__foot">
              {detail.status === 'pending' ? (
                <>
                  <button type="button" className="ui-btn ui-btn--quiet" onClick={() => openReject(detail)}>
                    Reject request
                  </button>
                  <button type="button" className="ui-btn ui-btn--primary" onClick={() => openApprove(detail)}>
                    Approve and allocate
                  </button>
                </>
              ) : (
                <button type="button" className="ui-btn ui-btn--ghost" onClick={closeDetail}>
                  Close
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}

      {approveTarget && (
        <div className="ui-overlay" onMouseDown={(event) => closeOnBackdrop(event, closeApprove)}>
          <div
            className="ui-modal ui-modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-approve-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 className="ui-h2" id="ops-approve-title">Approve request</h2>
                <p className="ops-modal__sub">{itemNameOf(approveTarget)}</p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={closeApprove} autoFocus>
                <CloseIcon />
              </button>
            </header>
            <div className="ui-modal__body">
              <div className="ui-stack ui-stack--sm">
                <div className="ops-callout">
                  <p className="ops-callout__title">
                    {approveTarget.quantity} × {itemNameOf(approveTarget)} for{' '}
                    {approveTarget.projectId?.name || 'this project'}
                  </p>
                  <p className="ops-callout__sub">
                    Requested by {approveTarget.requestedBy?.name || 'unknown requester'} ·{' '}
                    {formatStamp(approveTarget.createdAt)}
                  </p>
                </div>

                <dl className="ops-facts">
                  <div>
                    <dt className="ops-fact__label">Requested</dt>
                    <dd className="ops-fact__value ops-fact__value--num">{approveTarget.quantity}</dd>
                  </div>
                  <div>
                    <dt className="ops-fact__label">Available now</dt>
                    <dd className="ops-fact__value ops-fact__value--num">{approveStock}</dd>
                  </div>
                </dl>

                {approveShort ? (
                  <div className="ui-notice">
                    Requested quantity ({approveTarget.quantity}) exceeds currently available stock (
                    {approveStock}). Do you still wish to attempt approval?
                  </div>
                ) : (
                  <p className="ops-note">
                    This deducts {approveTarget.quantity} from available stock once and allocates it to{' '}
                    {approveTarget.projectId?.name || 'the project'}.
                  </p>
                )}

                {approveError && (
                  <div className="ui-notice ui-notice--error" role="alert">{approveError}</div>
                )}
              </div>
            </div>
            <footer className="ui-modal__foot">
              <button type="button" className="ui-btn ui-btn--ghost" onClick={closeApprove}>
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={confirmApprove}
                disabled={actionLoading === approveTarget._id}
              >
                {actionLoading === approveTarget._id
                  ? 'Approving…'
                  : approveShort
                    ? 'Attempt approval'
                    : 'Approve and allocate'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="ui-overlay" onMouseDown={(event) => closeOnBackdrop(event, closeReject)}>
          <div
            className="ui-modal ui-modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-reject-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 className="ui-h2" id="ops-reject-title">Reject request</h2>
                <p className="ops-modal__sub">
                  {rejectTarget.quantity} × {itemNameOf(rejectTarget)}
                </p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={closeReject} autoFocus>
                <CloseIcon />
              </button>
            </header>
            <form onSubmit={handleReject}>
              <div className="ui-modal__body">
                <p className="ops-note">
                  Give a clear reason. It is shown to the team leader in their project history.
                </p>
                <div className="ops-form-error">
                  <label className="ui-label" htmlFor="ops-reject-reason">Reason for rejection</label>
                  <textarea
                    id="ops-reject-reason"
                    className="ui-field ui-field--area"
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="What should the team leader change or provide?"
                    required
                  />
                </div>
                {rejectError && (
                  <div className="ui-notice ui-notice--error ops-form-error" role="alert">
                    {rejectError}
                  </div>
                )}
              </div>
              <footer className="ui-modal__foot">
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost"
                  onClick={closeReject}
                  disabled={actionLoading === rejectTarget._id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn--danger"
                  disabled={actionLoading === rejectTarget._id || !rejectReason.trim()}
                >
                  {actionLoading === rejectTarget._id ? 'Rejecting…' : 'Confirm rejection'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
