import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

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

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<any>('GET', '/notifications');
      setNotifications(res.data || []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err?.message || 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const markRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api('PATCH', `/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
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

  const getTypeMeta = (type: string, title: string) => {
    const isFeedback = title.toLowerCase().includes('feedback');
    if (isFeedback) {
      return {
        icon: '💬',
        badgeClass: 'badge-purple',
        badgeBg: 'rgba(139, 92, 246, 0.12)',
        badgeColor: '#8b5cf6',
        badgeLabel: 'Feedback',
      };
    }
    switch (type) {
      case 'material_request_submitted':
      case 'material_request_created':
      case 'material_request':
        return {
          icon: '🛒',
          badgeClass: 'badge-warning',
          badgeBg: 'rgba(245, 158, 11, 0.12)',
          badgeColor: '#f59e0b',
          badgeLabel: 'Material Request',
        };
      case 'material_added':
      case 'project_material_added':
        return {
          icon: '📦',
          badgeClass: 'badge-primary',
          badgeBg: 'rgba(59, 130, 246, 0.12)',
          badgeColor: '#3b82f6',
          badgeLabel: 'Material Added',
        };
      case 'material_request_approved':
      case 'club_join_approved':
      case 'project_join_approved':
        return {
          icon: '✅',
          badgeClass: 'badge-success',
          badgeBg: 'rgba(16, 185, 129, 0.12)',
          badgeColor: '#10b981',
          badgeLabel: 'Approved',
        };
      case 'material_request_rejected':
      case 'club_join_rejected':
      case 'project_join_rejected':
        return {
          icon: '❌',
          badgeClass: 'badge-danger',
          badgeBg: 'rgba(239, 68, 68, 0.12)',
          badgeColor: '#ef4444',
          badgeLabel: 'Rejected',
        };
      case 'mentor_assigned':
        return {
          icon: '🎓',
          badgeClass: 'badge-primary',
          badgeBg: 'rgba(59, 130, 246, 0.12)',
          badgeColor: '#3b82f6',
          badgeLabel: 'Mentorship',
        };
      case 'club_join_request':
      case 'project_join_request':
        return {
          icon: '👥',
          badgeClass: 'badge-warning',
          badgeBg: 'rgba(245, 158, 11, 0.12)',
          badgeColor: '#f59e0b',
          badgeLabel: 'Join Request',
        };
      case 'event_created':
        return {
          icon: '📅',
          badgeClass: 'badge-primary',
          badgeBg: 'rgba(59, 130, 246, 0.12)',
          badgeColor: '#3b82f6',
          badgeLabel: 'New Event',
        };
      case 'event_reminder':
        return {
          icon: '⏰',
          badgeClass: 'badge-warning',
          badgeBg: 'rgba(245, 158, 11, 0.12)',
          badgeColor: '#f59e0b',
          badgeLabel: 'Event Reminder',
        };
      case 'project_update':
      default:
        return {
          icon: '📋',
          badgeClass: 'badge-info',
          badgeBg: 'rgba(99, 102, 241, 0.12)',
          badgeColor: '#6366f1',
          badgeLabel: 'Project Update',
        };
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="page-container" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 9px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Stay informed with real-time updates on your projects, feedback, requests, and club activities.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              className="btn btn-sm btn-outline"
              onClick={markAllAsRead}
              disabled={markingAll}
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              {markingAll ? 'Marking...' : '✓ Mark All as Read'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: filter === 'all' ? 'var(--primary)' : 'var(--bg-card-2)',
            color: filter === 'all' ? 'white' : 'var(--text-muted)',
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: filter === 'unread' ? 'var(--primary)' : 'var(--bg-card-2)',
            color: filter === 'unread' ? 'white' : 'var(--text-muted)',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', display: 'block' }}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading notifications...</p>
        </div>
      ) : error ? (
        <div
          className="empty-state"
          style={{
            padding: '48px 20px',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--danger-soft, #fee2e2)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--danger, #ef4444)' }}>
            Failed to Load Notifications
          </h4>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            {error}
          </p>
          <button className="btn btn-sm btn-primary" onClick={fetchNotifications}>
            Retry
          </button>
        </div>
      ) : filteredNotifications.length ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredNotifications.map((n) => {
            const meta = getTypeMeta(n.type, n.title);
            const metadata = n.metadata || {};

            return (
              <div
                key={n._id}
                className="card"
                style={{
                  padding: '20px',
                  background: n.isRead ? 'var(--bg-card-2)' : 'var(--surface)',
                  border: n.isRead ? '1px solid var(--border)' : '1px solid var(--accent)',
                  boxShadow: n.isRead ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.08)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  borderLeft: n.isRead ? '1px solid var(--border)' : '4px solid var(--accent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Category Icon */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: meta.badgeBg,
                      color: meta.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Main Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}
                        >
                          {n.type === 'club_join_request' && (!n.title || n.title.includes('Join Request'))
                            ? 'New Club Join Request'
                            : n.type === 'project_join_request' && (!n.title || n.title.includes('Join Request'))
                            ? 'New Project Join Request'
                            : n.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: meta.badgeBg,
                            color: meta.badgeColor,
                          }}
                        >
                          {meta.badgeLabel}
                        </span>
                        {!n.isRead && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              display: 'inline-block',
                            }}
                          ></span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-faint)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatTimestamp(n.createdAt)}
                      </span>
                    </div>

                    {/* Notification Message */}
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: '14px',
                        color: 'var(--text)',
                        lineHeight: 1.5,
                      }}
                    >
                      {n.message ||
                        (n.type === 'club_join_request'
                          ? 'A student has requested to join this club.'
                          : n.type === 'project_join_request'
                          ? 'A student has requested to join this project.'
                          : '')}
                    </p>

                    {/* Metadata Context Chips */}
                    {(metadata.actorName ||
                      metadata.actorEmail ||
                      metadata.department ||
                      metadata.semester ||
                      metadata.status ||
                      metadata.projectName ||
                      metadata.clubName ||
                      metadata.entityName ||
                      metadata.quantity ||
                      metadata.source ||
                      metadata.hasAttachments) && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        {metadata.actorName && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            👤 <strong>{metadata.actorName}</strong>
                          </span>
                        )}
                        {metadata.actorEmail && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            ✉️ {metadata.actorEmail}
                          </span>
                        )}
                        {metadata.department && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            🏛️ {metadata.department}
                          </span>
                        )}
                        {metadata.semester && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            📚 Semester {metadata.semester}
                          </span>
                        )}
                        {metadata.status && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: metadata.status === 'pending' ? 'var(--warn-soft)' : 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: metadata.status === 'pending' ? 'var(--warn)' : 'var(--text-muted)',
                              textTransform: 'capitalize',
                            }}
                          >
                            ⏳ Status: {metadata.status}
                          </span>
                        )}
                        {metadata.projectName && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            🏷️ {metadata.projectName}
                          </span>
                        )}
                        {metadata.clubName && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            🏢 {metadata.clubName}
                          </span>
                        )}
                        {metadata.entityName && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            📦 {metadata.entityName}
                            {metadata.quantity ? ` (Qty: ${metadata.quantity})` : ''}
                          </span>
                        )}
                        {metadata.source && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            🏷️ Source: {metadata.source === 'self_purchased' ? 'Self-Purchased' : metadata.source === 'owned' ? 'Owned' : metadata.source}
                          </span>
                        )}
                        {metadata.hasAttachments && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            📎 Attachments ({metadata.attachmentCount || 1})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Highlight Box: Faculty Feedback */}
                    {metadata.feedbackText && (
                      <div
                        style={{
                          marginTop: '8px',
                          marginBottom: '12px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'rgba(139, 92, 246, 0.06)',
                          borderLeft: '3px solid #8b5cf6',
                          fontSize: '13px',
                          color: 'var(--text)',
                          lineHeight: 1.5,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#8b5cf6',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px',
                          }}
                        >
                          Feedback Note
                        </div>
                        <em>"{metadata.feedbackText}"</em>
                      </div>
                    )}

                    {/* Highlight Box: Rejection / Request Reason */}
                    {metadata.reason && (
                      <div
                        style={{
                          marginTop: '8px',
                          marginBottom: '12px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: n.type === 'material_request_rejected' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(99, 102, 241, 0.06)',
                          borderLeft: n.type === 'material_request_rejected' ? '3px solid #ef4444' : '3px solid #6366f1',
                          fontSize: '13px',
                          color: 'var(--text)',
                          lineHeight: 1.5,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: n.type === 'material_request_rejected' ? '#ef4444' : '#6366f1',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px',
                          }}
                        >
                          {n.type === 'material_request_rejected' ? 'Rejection Reason' : 'Request Reason'}
                        </div>
                        {metadata.reason}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {n.link && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAction(n)}
                          style={{
                            fontSize: '12px',
                            padding: '6px 14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {n.actionText || 'View Details'} →
                        </button>
                      )}

                      {!n.isRead && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => markRead(n._id, e)}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                          }}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="empty-state"
          style={{
            padding: '60px 20px',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px dashed var(--border)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔔</div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text)' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h4>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {filter === 'unread'
              ? 'You have caught up with all your notifications!'
              : 'Updates about your projects, clubs, and material requests will appear here.'}
          </p>
        </div>
      )}
    </div>
  );
}
