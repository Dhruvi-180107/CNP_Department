import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProjectJoinRequestsProps {
  projectId: string;
  onUpdate?: () => void;
}

export function ProjectJoinRequests({ projectId, onUpdate }: ProjectJoinRequestsProps) {
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
      setRequests(allRequests.filter((r: any) => r.status === 'pending'));
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
      setRequests((prev) => prev.filter((r) => r._id !== id));
      alert('Join request approved. Student has been added to the project team.');
      onUpdate?.();
    } catch (err: any) {
      alert(err.message || 'Failed to approve join request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api('PATCH', `/join-requests/${id}/reject`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      alert('Join request rejected.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject join request');
    }
  };

  if (!canReview || !authorized) return null;
  if (loading) return null;

  return (
    <div className="card" id="join-requests" style={{ marginBottom: '24px' }}>
      <h3 className="card-title" style={{ marginBottom: '16px' }}>
        Pending Join Requests
      </h3>
      <div className="card-body" style={{ padding: 0 }}>
        {requests.length ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {requests.map((r) => (
              <div
                key={r._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--border)',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card-2)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--warn-soft)',
                      color: 'var(--warn)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {(r.studentId?.name || '?').charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>
                        {r.studentId?.name || 'Unknown Student'}
                      </span>
                      <span
                        className="badge badge-warning"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: 'var(--warn-soft)',
                          color: 'var(--warn)',
                        }}
                      >
                        Pending
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '2px' }}>
                      <a
                        href={`mailto:${r.studentId?.email}`}
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}
                      >
                        {r.studentId?.email}
                      </a>
                      {(r.studentId?.department || r.studentId?.semester || r.studentId?.enrollmentNumber) && (
                        <span style={{ color: 'var(--text-faint)' }}>
                          {' • '}
                          {r.studentId?.enrollmentNumber && <span>Enrollment: {r.studentId.enrollmentNumber} • </span>}
                          {r.studentId?.department}
                          {r.studentId?.department && r.studentId?.semester ? ', ' : ''}
                          {r.studentId?.semester ? `Semester ${r.studentId.semester}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>
                      Requested: {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 16px' }}
                    onClick={() => handleApprove(r._id)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{
                      padding: '6px 16px',
                      color: 'var(--danger)',
                      borderColor: 'var(--danger-soft)',
                      background: 'var(--danger-soft)',
                    }}
                    onClick={() => handleReject(r._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="empty-state"
            style={{
              padding: '24px',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              background: 'var(--surface)',
            }}
          >
            No pending join requests for this project.
          </div>
        )}
      </div>
    </div>
  );
}
