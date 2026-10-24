import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProjectJoinRequestsProps {
  projectId: string;
  onUpdate?: () => void;
  onCountChange?: (count: number) => void;
}

function initialOf(name?: string): string {
  return (name || '?').replace(/^Dr\.\s*/i, '').trim().charAt(0).toUpperCase() || '?';
}

export function ProjectJoinRequests({ projectId, onUpdate, onCountChange }: ProjectJoinRequestsProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Only project_admin and faculty_mentor can review project join requests
  const canReview = user?.role === 'project_admin' || user?.role === 'faculty_mentor';

  const loadRequests = async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    try {
      const res = await api<any>('GET', `/join-requests/project/${projectId}`);
      setAuthorized(true);
      const allRequests = res.data || [];
      const pending = allRequests.filter((r: any) => r.status === 'pending');
      setRequests(pending);
      onCountChange?.(pending.length);
    } catch (err: any) {
      // 403 means user is not an assigned mentor for this project
      if (err.status !== 403) {
        console.error('Failed to load project join requests:', err);
      }
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [projectId, user]);

  const handleApprove = async (id: string) => {
    try {
      await api('PATCH', `/join-requests/${id}/approve`);
      const next = requests.filter((r) => r._id !== id);
      setRequests(next);
      onCountChange?.(next.length);
      alert('Join request approved. Student has been added to the project team.');
      onUpdate?.();
    } catch (err: any) {
      alert(err.message || 'Failed to approve join request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api('PATCH', `/join-requests/${id}/reject`);
      const next = requests.filter((r) => r._id !== id);
      setRequests(next);
      onCountChange?.(next.length);
      alert('Join request rejected.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject join request');
    }
  };

  if (!canReview || !authorized) return null;
  if (loading) return null;

  // Nothing to act on: the facts panel already says "None pending".
  if (!requests.length) return null;

  return (
    <section className="ui-panel prj-joins" id="join-requests" aria-labelledby="prj-joins-title">
      <header className="ui-panel__head">
        <div className="ui-panel__titles">
          <h2 className="ui-panel__title" id="prj-joins-title">
            Join requests
          </h2>
          <span className="ui-panel__meta">{requests.length} pending</span>
        </div>
      </header>
      <div className="ui-panel__body ui-panel__body--flush">
        <ul className="prj-join-list">
          {requests.map((request) => (
            <li className="prj-join" key={request._id}>
              <span className="ui-avatar prj-avatar" aria-hidden="true">
                {initialOf(request.studentId?.name)}
              </span>
              <div className="prj-join__main">
                <p className="prj-join__name">{request.studentId?.name || 'Unknown student'}</p>
                <p className="prj-join__sub">
                  {request.studentId?.email && (
                    <a className="prj-join__mail" href={`mailto:${request.studentId.email}`}>
                      {request.studentId.email}
                    </a>
                  )}
                  {(request.studentId?.department || request.studentId?.semester) && (
                    <span className="prj-join__dot" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {[
                    request.studentId?.enrollmentNumber
                      ? `Enrollment ${request.studentId.enrollmentNumber}`
                      : null,
                    request.studentId?.department,
                    request.studentId?.semester ? `Semester ${request.studentId.semester}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="prj-join__meta">
                <span className="ui-meta">Requested {new Date(request.createdAt).toLocaleString()}</span>
                <div className="prj-join__actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--sm"
                    onClick={() => handleApprove(request._id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--danger ui-btn--sm"
                    onClick={() => handleReject(request._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
