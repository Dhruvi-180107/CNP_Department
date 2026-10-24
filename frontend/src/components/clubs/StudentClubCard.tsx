import { useState } from 'react';
import '../../pages/Clubs/clubs.css';

interface StudentClubCardProps {
  club: {
    _id: string;
    name: string;
    description?: string;
    logo?: string | null;
    coverImage?: string | null;
    images?: string[];
    facultyCoordinatorId?: {
      _id?: string;
      name?: string;
      department?: string;
      profileImage?: string | null;
    } | null;
    totalMembers?: number;
    memberCount?: number;
    coreTeamCount?: number;
  };
  membership?: {
    membershipType: string;
    position?: string | null;
  } | null;
  /** A join request is waiting on the coordinator. */
  pending?: boolean;
  /** Overrides the membership tag, e.g. "Admin" or "Coordinator". */
  tag?: string;
  /** The single emphasised club on a directory page. */
  lead?: boolean;
  onClick: () => void;
}

/** First letters of the two significant words in a club name. */
function monogram(name: string): string {
  const cleaned = name
    .replace(/\b(club|society|committee|association|collective|group|cell)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return name.trim().slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function StudentClubCard({
  club,
  membership = null,
  pending = false,
  tag,
  lead = false,
  onClick,
}: StudentClubCardProps) {
  const [logoError, setLogoError] = useState(false);
  const [coordImgError, setCoordImgError] = useState(false);

  const isCoreTeam = membership?.membershipType === 'core_team';
  const position =
    isCoreTeam && membership?.position && membership.position.toLowerCase() !== 'member'
      ? membership.position
      : null;

  const coordinator =
    typeof club.facultyCoordinatorId === 'object' && club.facultyCoordinatorId !== null
      ? club.facultyCoordinatorId
      : null;

  const coordInitial = coordinator?.name
    ? coordinator.name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'C'
    : 'C';

  const clubImage = club.logo || club.coverImage || (club.images && club.images.length > 0 ? club.images[0] : null);

  const members = club.memberCount ?? club.totalMembers;
  const coreTeam = club.coreTeamCount ?? null;
  const coreShare =
    members && coreTeam != null && members > 0 ? Math.min(1, coreTeam / members) : null;
  const regular = members != null && coreTeam != null ? members - coreTeam : null;

  const membershipTag = tag
    ? { text: tag, tone: 'ui-tag--plain' }
    : pending
      ? { text: 'Request pending', tone: 'is-warning' }
      : isCoreTeam
        ? { text: position ? `Core team · ${position}` : 'Core team', tone: 'is-accent' }
        : membership
          ? { text: 'Member', tone: '' }
          : null;

  const tagNode = membershipTag ? (
    <span className={`ui-tag ${membershipTag.tone}`}>{membershipTag.text}</span>
  ) : null;

  const openAffordance = (
    <span className="clubs-card__open">
      {lead ? 'Open club' : 'Open'}
      <ArrowRight />
    </span>
  );

  return (
    <article
      className={`clubs-card${lead ? ' clubs-card--lead' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${club.name}${membershipTag ? `, ${membershipTag.text}` : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="clubs-card__plate">
        {clubImage && !logoError ? (
          <img
            src={clubImage}
            alt=""
            onError={() => setLogoError(true)}
            className="clubs-mono clubs-mono--image"
          />
        ) : (
          <span className="clubs-mono" aria-hidden="true">{monogram(club.name)}</span>
        )}
      </div>

      <div className="clubs-card__main">
        <div className="clubs-card__title-row">
          <h3 className="clubs-card__name">{club.name}</h3>
          {lead ? tagNode : null}
          {lead ? openAffordance : null}
        </div>

        <p className="clubs-card__desc">{club.description || 'No description yet.'}</p>

        <div className="clubs-card__meta">
          {coordinator?.name ? (
            <span className="clubs-card__coord">
              {coordinator.profileImage && !coordImgError ? (
                <img
                  src={coordinator.profileImage}
                  alt=""
                  onError={() => setCoordImgError(true)}
                  className="clubs-card__coord-face"
                />
              ) : (
                <span className="clubs-card__coord-face" aria-hidden="true">{coordInitial}</span>
              )}
              <span className="clubs-card__coord-text">
                <span className="clubs-card__coord-name">{coordinator.name}</span>
                {coordinator.department && (
                  <span className="clubs-card__coord-dept">{coordinator.department}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="clubs-card__coord clubs-card__coord--none">No coordinator assigned</span>
          )}

          {members != null && (
            <>
              <span className="clubs-card__dot" aria-hidden="true" />
              <span className="clubs-card__count">
                {members} {members === 1 ? 'member' : 'members'}
              </span>
            </>
          )}
        </div>
      </div>

      {lead ? (
        coreShare != null ? (
          <div className="clubs-card__comp">
            <div className="ui-meter" aria-hidden="true">
              <div className="ui-meter__fill" style={{ transform: `scaleX(${coreShare})` }} />
            </div>
            <span className="clubs-card__comp-label">
              <b>{coreTeam}</b> core team · <b>{regular}</b> {regular === 1 ? 'member' : 'members'}
            </span>
          </div>
        ) : null
      ) : (
        <div className="clubs-card__side">
          {tagNode}
          {openAffordance}
        </div>
      )}
    </article>
  );
}
