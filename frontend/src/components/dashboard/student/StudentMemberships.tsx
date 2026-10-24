import { Link } from 'react-router-dom';
import { DashboardSection, PanelError } from './DashboardSection';
import { ArrowRightIcon, ClubIcon } from './StudentIcons';
import { initialsOf, membershipRole, plural } from './studentUtils';
import type { StudentClubMembership } from '../../../types/studentDashboard';

interface StudentMembershipsProps {
  clubs: StudentClubMembership[];
  error?: string;
}

export function StudentMemberships({ clubs, error }: StudentMembershipsProps) {
  return (
    <DashboardSection
      id="sd-clubs"
      title="Your clubs"
      meta={clubs.length > 0 ? `${clubs.length}` : undefined}
      actionLabel="All clubs"
      actionTo="/clubs"
      className="sd-clubs"
    >
      {error ? <PanelError message={error} /> : null}

      {clubs.length > 0 ? (
        <ul className="ui-rows sd-club-rows">
          {clubs.map(({ club, membership }) => {
            const role = membershipRole(membership);
            const members = club.totalMembers ?? club.memberCount;
            return (
              <li className="ui-row ui-row--link" key={club._id}>
                <span className="ui-avatar sd-avatar" aria-hidden="true">
                  {club.logo ? <img src={club.logo} alt="" /> : initialsOf(club.name)}
                </span>
                <div className="ui-row__main">
                  <p className="ui-row__title">
                    <Link className="sd-row-title" to={`/clubs/${club._id}`}>
                      {club.name}
                    </Link>
                  </p>
                  {typeof members === 'number' ? (
                    <p className="ui-row__sub">
                      <span className="sd-metric">
                        <span className="sd-metric__n">{members}</span>
                        <span>{plural(members, 'member', 'members')}</span>
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="ui-row__meta">
                  <span className={role.core ? 'ui-tag is-accent' : 'ui-tag ui-tag--plain'}>{role.label}</span>
                </div>
                <div className="ui-row__actions" aria-hidden="true">
                  <span className="ui-btn ui-btn--quiet ui-btn--sm">
                    Open
                    <ArrowRightIcon className="sd-icon sd-icon--sm" />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : !error ? (
        <div className="sd-panel__state">
          <div className="ui-empty sd-empty">
            <span className="ui-empty__mark">
              <ClubIcon />
            </span>
            <p className="ui-empty__title">No club memberships yet</p>
            <p className="ui-empty__text">
              Student Managed Clubs meet through the week. Join one and its events, members and
              updates appear here.
            </p>
            <Link className="ui-btn ui-btn--quiet ui-btn--sm" to="/clubs">
              Find a club
            </Link>
          </div>
        </div>
      ) : null}
    </DashboardSection>
  );
}
