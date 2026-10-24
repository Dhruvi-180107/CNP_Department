import { Link } from 'react-router-dom';
import { AlertIcon, ArrowRightIcon, InboxIcon } from './StudentIcons';
import { relativeTime } from './studentUtils';
import type { StudentNotificationItem } from '../../../types/studentDashboard';

interface StudentNotificationSummaryProps {
  unreadCount: number;
  notifications: StudentNotificationItem[];
  error?: string;
}

export function StudentNotificationSummary({
  unreadCount,
  notifications,
  error,
}: StudentNotificationSummaryProps) {
  const recent = notifications.slice(0, 3);

  return (
    <section className="ui-panel sd-notes" aria-labelledby="sd-notes-heading">
      <header className="ui-panel__head">
        <div className="ui-panel__titles">
          <h2 className="ui-panel__title" id="sd-notes-heading">
            Notifications
          </h2>
          {unreadCount > 0 ? (
            <span className="ui-count ui-count--accent" aria-label={`${unreadCount} unread`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <span className="ui-panel__meta">{error ? 'Unavailable' : 'All read'}</span>
          )}
        </div>
      </header>

      <div className="ui-panel__body ui-panel__body--flush sd-panel__body">
        {error ? (
          <div className="sd-panel__state">
            <p className="ui-notice ui-notice--error sd-error" role="alert">
              <AlertIcon className="sd-icon sd-icon--sm" />
              <span>{error}</span>
            </p>
          </div>
        ) : recent.length === 0 ? (
          <div className="sd-panel__state">
            <div className="ui-empty sd-empty">
              <span className="ui-empty__mark">
                <InboxIcon />
              </span>
              <p className="ui-empty__title">Inbox is clear</p>
              <p className="ui-empty__text">
                Approvals, mentor feedback and event reminders arrive here.
              </p>
            </div>
          </div>
        ) : (
          <div className="ui-rows sd-note-rows">
            {recent.map((item) => {
              const unread = !item.isRead;
              const time = relativeTime(item.createdAt);
              return (
                <Link
                  key={item._id}
                  className={`ui-row ui-row--link sd-note${unread ? ' is-unread' : ''}`}
                  to={item.link || '/notifications'}
                >
                  <span className="sd-note__mark" aria-hidden="true" />
                  <span className="ui-row__main">
                    <span className="ui-row__title">
                      {unread ? <span className="ui-visually-hidden">Unread: </span> : null}
                      {item.title}
                    </span>
                    {item.message ? (
                      <span className="ui-row__sub ui-truncate">{item.message}</span>
                    ) : null}
                  </span>
                  {time ? (
                    <span className="ui-row__meta">
                      <time className="sd-note__time" dateTime={item.createdAt}>
                        {time}
                      </time>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <footer className="ui-panel__foot sd-notes__foot">
        <span className="ui-meta">
          {error
            ? 'Inbox unavailable'
            : notifications.length > 0
              ? `${notifications.length} recent ${notifications.length === 1 ? 'notice' : 'notices'}`
              : 'No notices on file'}
        </span>
        <Link className="sd-foot-link" to="/notifications">
          Open inbox
          <ArrowRightIcon className="sd-icon sd-icon--sm sd-arrow" />
        </Link>
      </footer>
    </section>
  );
}
