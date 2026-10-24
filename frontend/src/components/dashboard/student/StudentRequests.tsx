import { Link } from 'react-router-dom';
import { requestStatus, requestTarget, tagToneClass } from './studentUtils';
import type { StudentJoinRequest } from '../../../types/studentDashboard';

interface StudentRequestsProps {
  requests: StudentJoinRequest[];
  error?: string;
}

export function StudentRequests({ requests, error }: StudentRequestsProps) {
  const pending = requests.filter((request) => request.status === 'pending');
  const display = [
    ...pending,
    ...requests.filter((request) => request.status !== 'pending'),
  ].slice(0, 4);
  const hidden = requests.length - display.length;

  const meta = pending.length > 0
    ? `${pending.length} awaiting a decision`
    : requests.length > 0
      ? `${requests.length} on file, none pending`
      : null;

  return (
    <section className="sd-strip" aria-labelledby="sd-requests-heading">
      <div className="sd-strip__lead">
        <h2 className="sd-strip__title" id="sd-requests-heading">
          Join requests
        </h2>
        {meta ? <span className="sd-strip__meta">{meta}</span> : null}
      </div>

      {error ? (
        <p className="sd-strip__error" role="alert">
          {error}
        </p>
      ) : display.length === 0 ? (
        <p className="sd-strip__empty">
          No requests yet. <Link className="ui-link" to="/clubs">Find a club</Link> or a project to
          apply.
        </p>
      ) : (
        <ul className="sd-strip__items">
          {display.map((request) => {
            const target = requestTarget(request);
            const status = requestStatus(request.status);
            const body = (
              <>
                <span className="sd-chip__kind">{target.kind}</span>
                <span className="sd-chip__name ui-truncate">{target.name}</span>
                <span className={tagToneClass(status.tone)}>{status.label}</span>
              </>
            );
            return (
              <li key={request._id}>
                {target.id ? (
                  <Link
                    className="sd-chip"
                    to={target.kind === 'Club' ? `/clubs/${target.id}` : `/projects/${target.id}`}
                  >
                    {body}
                  </Link>
                ) : (
                  <span className="sd-chip">{body}</span>
                )}
              </li>
            );
          })}
          {hidden > 0 ? <li className="sd-strip__more">+{hidden} more</li> : null}
        </ul>
      )}
    </section>
  );
}
