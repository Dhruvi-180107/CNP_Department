import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';
import { useStudentDashboardData } from '../../hooks/useStudentDashboardData';
import { DashboardSkeleton } from '../../components/dashboard/student/DashboardSkeleton';
import { StudentDashboardHeader } from '../../components/dashboard/student/StudentDashboardHeader';
import { StudentMemberships } from '../../components/dashboard/student/StudentMemberships';
import { StudentNotificationSummary } from '../../components/dashboard/student/StudentNotificationSummary';
import { StudentOverview, countPendingRequests } from '../../components/dashboard/student/StudentOverview';
import { StudentProjects } from '../../components/dashboard/student/StudentProjects';
import { StudentRequests } from '../../components/dashboard/student/StudentRequests';
import { StudentUpcomingEvents } from '../../components/dashboard/student/StudentUpcomingEvents';
import {
  asEvent,
  calendarDaysUntil,
  refId,
  sortEvents,
  type StudentEvent,
} from '../../components/dashboard/student/studentUtils';
import './student-dash.css';

interface StudentDashboardPageProps {
  user: User;
}

export function StudentDashboardPage({ user }: StudentDashboardPageProps) {
  const navigate = useNavigate();
  const data = useStudentDashboardData(user);

  if (data.loading) return <DashboardSkeleton />;

  const events = sortEvents(
    data.upcomingEvents.map(asEvent).filter((event): event is StudentEvent => event !== null)
  );
  const nextEvent = events[0] ?? null;
  // MOCK: derived counts — no summary endpoint returns "days to the next event",
  // core-team seats, team leads or pending projects. See docs/mocks/student-dashboard.md
  const nextEventInDays = nextEvent?.eventDate ? calendarDaysUntil(nextEvent.eventDate) : null;

  const coreTeamCount = data.clubs.filter(({ membership }) => membership.membershipType === 'core_team').length;
  const teamLeadCount = data.projects.filter((project) => refId(project.teamLeaderId) === user._id).length;

  const pendingProjectIds = new Set(
    data.joinRequests
      .filter((request) => request.status === 'pending' && request.projectId)
      .map((request) => refId(request.projectId))
      .filter((id): id is string => Boolean(id))
  );

  const pendingRequests = countPendingRequests(data.joinRequests);
  const firstError =
    data.errors.clubs ??
    data.errors.projects ??
    data.errors.events ??
    data.errors.requests ??
    data.errors.notifications;

  return (
    <div className="sd-dash">
      <StudentDashboardHeader
        user={user}
        nextEventInDays={data.errors.events ? null : nextEventInDays}
        upcomingCount={data.errors.events ? null : events.length}
        onExploreClubs={() => navigate('/clubs')}
        onExploreProjects={() => navigate('/projects')}
      />

      <StudentOverview
        clubCount={data.errors.clubs ? null : data.clubs.length}
        projectCount={data.errors.projects ? null : data.projects.length}
        upcomingEventCount={data.errors.events ? null : events.length}
        unreadNotifications={data.errors.notifications ? null : data.unreadCount}
        pendingRequestCount={data.errors.requests ? null : pendingRequests}
        coreTeamCount={coreTeamCount}
        teamLeadCount={teamLeadCount}
        nextEventInDays={nextEventInDays}
      />

      {firstError ? (
        <div className="ui-notice ui-notice--error sd-notice" role="status">
          <span className="sd-notice__text">Some details could not be refreshed.</span>
          <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={() => void data.refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      <div className="sd-compose">
        <StudentUpcomingEvents events={data.upcomingEvents} error={data.errors.events} />

        <StudentNotificationSummary
          unreadCount={data.unreadCount}
          notifications={data.notifications}
          error={data.errors.notifications}
        />

        <StudentMemberships clubs={data.clubs} error={data.errors.clubs} />

        <StudentProjects
          projects={data.projects}
          currentUserId={user._id}
          pendingProjectIds={pendingProjectIds}
          error={data.errors.projects}
        />

        <StudentRequests requests={data.joinRequests} error={data.errors.requests} />
      </div>
    </div>
  );
}
