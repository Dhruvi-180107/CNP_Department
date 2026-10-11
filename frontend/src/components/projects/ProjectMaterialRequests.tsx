import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function ProjectMaterialRequests({ projectId }: { projectId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<any>('GET', `/material-requests/project/${projectId}`)
      .then(res => setRequests(res.data))
      .catch(err => {
        if (err.status !== 403) setError(err.message || 'Failed to load requests');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="spinner"></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>{error}</div>;

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: '20px' }}>Material Requests</h3>
      <div className="card-body" style={{ padding: 0 }}>
        {requests.length ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {requests.map(req => {
              const statusColors: any = {
                'pending': { bg: 'var(--warn-soft)', color: 'var(--warn)', label: 'Pending' },
                'approved': { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Approved' },
                'rejected': { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Rejected' },
              };
              const statusStyle = statusColors[req.status] || statusColors['pending'];
              
              return (
              <div key={req._id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text)' }}>
                      {req.materialName} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>x{req.quantity}</span>
                    </h4>
                    {req.createdAt && <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{new Date(req.createdAt).toLocaleDateString()}</div>}
                  </div>
                  <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, padding: '6px 12px', fontSize: '12px' }}>
                    {statusStyle.label}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)', fontSize: '13px' }}>Reason: </strong> {req.reason}
                  </div>
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div style={{ padding: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Rejection Reason:</strong> 
                      {req.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        ) : <div className="empty-state">No material requests found.</div>}
      </div>
    </div>
  );
}
