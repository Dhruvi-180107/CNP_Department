import { isEventPast } from '../../eventDate';
import '../../pages/Events/events.css';

export interface EventCardProps {
  event: any;
  canManage?: boolean;
  onEdit?: (event: any) => void;
  onDelete?: (eventId: string) => void;
  isPast?: boolean;
  compact?: boolean;
}

/**
 * One event as a compact object: date block, title, club, time and venue, with
 * the status tag giving way to the manage actions on hover. Used by the
 * dashboards and the club detail page.
 */
export function EventCard({
  event,
  canManage = false,
  onEdit,
  onDelete,
  isPast,
  compact = false,
}: EventCardProps) {
  const club = typeof event.clubId === 'object' && event.clubId !== null ? event.clubId : null;
  const clubName = club?.name || 'Department Club';
  const clubLogo = club?.logo || null;

  const rawDate = event.eventDate || event.date;
  const eventIsPast = isPast ?? isEventPast(rawDate);
  const eventDateObj = rawDate ? new Date(rawDate) : null;
  const isValidDate = eventDateObj !== null && !isNaN(eventDateObj.getTime());

  const formattedDate = isValidDate
    ? eventDateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date to be confirmed';

  const formattedTime = isValidDate
    ? eventDateObj.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const monthLabel = isValidDate ? eventDateObj.toLocaleDateString(undefined, { month: 'short' }) : 'TBD';
  const dayLabel = isValidDate ? String(eventDateObj.getDate()) : '—';
  const weekdayLabel = isValidDate
    ? eventDateObj.toLocaleDateString(undefined, { weekday: 'short' })
    : '';
  const whenLabel = isValidDate
    ? `${weekdayLabel} · ${formattedTime}`
    : formattedDate;

  const hasActions = canManage && (Boolean(onEdit) || Boolean(onDelete));

  return (
    <article
      id={`event-${event._id}`}
      className={`evt-card${eventIsPast ? ' is-past' : ''}${compact ? ' evt-card--compact' : ''}`}
      aria-label={`${event.title}, ${clubName}, ${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''}`}
    >
      <div className="evt-dateblock" aria-hidden="true">
        <span className="evt-dateblock__m">{monthLabel}</span>
        <span className="evt-dateblock__d">{dayLabel}</span>
      </div>

      <div className="evt-card__main">
        <div className="evt-card__top">
          <p className="evt-card__club">
            {clubLogo ? (
              <img className="evt-card__logo" src={clubLogo} alt="" />
            ) : (
              <svg className="evt-i evt-i--xs" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20v-1.4A4.6 4.6 0 0 1 8.6 14h6.8A4.6 4.6 0 0 1 20 18.6V20" />
                <circle cx="12" cy="7.8" r="3.6" />
              </svg>
            )}
            <span>{clubName}</span>
          </p>

          <div className="evt-card__slot">
            <span className={`ui-tag evt-card__status${eventIsPast ? '' : ' is-positive'}`}>
              {eventIsPast ? 'Past' : 'Upcoming'}
            </span>
            {hasActions && (
              <div className="evt-card__actions">
                {onEdit && (
                  <button
                    type="button"
                    className="ui-icon-btn"
                    aria-label={`Edit ${event.title}`}
                    onClick={() => onEdit(event)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                      <path d="m14.5 6.5 3 3" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="ui-icon-btn is-danger"
                    aria-label={`Delete ${event.title}`}
                    onClick={() => onDelete(event._id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M9.5 7V4.8h5V7M6.6 7l.8 12a1.6 1.6 0 0 0 1.6 1.4h6a1.6 1.6 0 0 0 1.6-1.4l.8-12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className="evt-card__title">{event.title}</h3>

        <p className="evt-card__meta">
          <span>
            <svg className="evt-i evt-i--xs" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            {isValidDate ? whenLabel : formattedDate}
          </span>
          {event.location && (
            <span>
              <svg className="evt-i evt-i--xs" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20.5s6.2-5.1 6.2-9.7a6.2 6.2 0 1 0-12.4 0c0 4.6 6.2 9.7 6.2 9.7Z" />
                <circle cx="12" cy="10.6" r="2.2" />
              </svg>
              <span className="ui-truncate">{event.location}</span>
            </span>
          )}
        </p>

        {!compact && event.description && <p className="evt-card__desc">{event.description}</p>}

        {(event.eventLink || event.relatedDocument?.url) && (
          <div className="evt-card__links">
            {event.eventLink && (
              <a
                className="evt-card__link"
                href={event.eventLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="evt-i evt-i--xs" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
                  <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5" />
                </svg>
                <span>{event.eventLinkName?.trim() || 'Event link'}</span>
              </a>
            )}
            {event.relatedDocument?.url && (
              <a
                className="evt-card__link"
                href={event.relatedDocument.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="evt-i evt-i--xs" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8.5L13 3.5Z" />
                  <path d="M13 3.5V8.5H18" />
                </svg>
                <span>
                  {event.relatedDocumentName?.trim() ||
                    event.relatedDocument.originalName ||
                    'Related document'}
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
