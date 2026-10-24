import { Link } from 'react-router-dom';
import { DashboardSection, PanelError } from './DashboardSection';
import {
  asEvent,
  calendarDaysUntil,
  clubNameOf,
  countdownFor,
  eventDateValue,
  formatClock,
  formatDayMonth,
  formatDayNumber,
  formatMonthShort,
  formatWeekday,
  sortEvents,
  type StudentEvent,
} from './studentUtils';
import { CalendarIcon, ChevronRightIcon, ClockIcon, PinIcon } from './StudentIcons';

interface StudentUpcomingEventsProps {
  events: unknown[];
  error?: string;
}

function EventDateBlock({ date }: { date: Date | null }) {
  if (!date) {
    return (
      <span className="sd-date" aria-hidden="true">
        <span className="sd-date__dow">Date</span>
        <span className="sd-date__day">--</span>
        <span className="sd-date__mon">TBA</span>
      </span>
    );
  }
  return (
    <time className="sd-date" dateTime={date.toISOString()}>
      <span className="sd-date__dow">{formatWeekday(date)}</span>
      <span className="sd-date__day">{formatDayNumber(date)}</span>
      <span className="sd-date__mon">{formatMonthShort(date)}</span>
    </time>
  );
}

function EventTime({ event }: { event: StudentEvent }) {
  const date = eventDateValue(event);
  if (!date) return <span>Time to be announced</span>;
  return <span>{formatClock(date)}</span>;
}

export function StudentUpcomingEvents({ events, error }: StudentUpcomingEventsProps) {
  const sorted = sortEvents(events.map(asEvent).filter((event): event is StudentEvent => event !== null));
  const next = sorted[0] ?? null;
  const rest = sorted.slice(1, 4);
  const nextDate = next ? eventDateValue(next) : null;
  const days = next?.eventDate ? calendarDaysUntil(next.eventDate) : null;
  const when = countdownFor(days);
  const nextClub = next ? clubNameOf(next) : null;

  return (
    <DashboardSection
      id="sd-next"
      title="Next up"
      meta={
        sorted.length > 0
          ? `${sorted.length} ${sorted.length === 1 ? 'event' : 'events'} ahead`
          : undefined
      }
      live={Boolean(next)}
      accent={Boolean(next)}
      actionLabel="Calendar"
      actionTo="/events"
      className="sd-next"
    >
      {error ? (
        <PanelError message={error} />
      ) : !next ? (
        <div className="sd-panel__state">
          <div className="ui-empty sd-empty">
            <span className="ui-empty__mark">
              <CalendarIcon />
            </span>
            <p className="ui-empty__title">Nothing on the calendar</p>
            <p className="ui-empty__text">
              Club events appear here as soon as they are published. The calendar link above shows
              everything across campus.
            </p>
          </div>
        </div>
      ) : (
        <div className="sd-panel__body ui-panel__body ui-panel__body--flush">
          <Link className="sd-next__lead" to="/events">
            <EventDateBlock date={nextDate} />
            <span className="sd-next__copy">
              <span className="sd-next__club">{nextClub ?? 'Campus calendar'}</span>
              <span className="sd-next__title">{next.title}</span>
              <span className="sd-next__facts">
                {next.location ? (
                  <span className="sd-next__fact">
                    <PinIcon className="sd-icon sd-icon--sm" />
                    <span className="ui-truncate">{next.location}</span>
                  </span>
                ) : null}
                <span className="sd-next__fact">
                  <ClockIcon className="sd-icon sd-icon--sm" />
                  <EventTime event={next} />
                </span>
              </span>
            </span>
            {when ? (
              <span className="sd-next__when">
                {when.value ? <span className="sd-next__when-n">{when.value}</span> : null}
                <span className="sd-next__when-l">{when.label}</span>
              </span>
            ) : null}
          </Link>

          {rest.length > 0 ? (
            <div className="ui-rows sd-week">
              {rest.map((event) => {
                const date = eventDateValue(event);
                const club = clubNameOf(event);
                const facts = [
                  club,
                  date ? formatClock(date) : 'Time to be announced',
                  event.location,
                ].filter(Boolean);
                return (
                  <Link key={event._id} className="ui-row ui-row--link sd-week__row" to="/events">
                    <span className="sd-week__date">
                      {date ? `${formatWeekday(date)} ${formatDayMonth(date)}` : 'Date TBA'}
                    </span>
                    <span className="ui-row__main">
                      <span className="ui-row__title">{event.title}</span>
                      <span className="ui-row__sub ui-truncate">{facts.join(' · ')}</span>
                    </span>
                    <span className="ui-row__actions" aria-hidden="true">
                      <ChevronRightIcon className="sd-icon sd-icon--sm sd-week__chevron" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </DashboardSection>
  );
}
