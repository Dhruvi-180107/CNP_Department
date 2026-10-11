import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function ProjectMaterials({ projectId }: { projectId: string }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<any>('GET', `/projects/${projectId}/materials`)
      .then(res => setMaterials(res.data))
      .catch(err => {
        if (err.status !== 403) setError(err.message || 'Failed to load materials');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="spinner"></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>{error}</div>;

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: '20px' }}>Project Materials</h3>
      <div className="card-body" style={{ padding: 0 }}>
        {materials.length ? (
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {materials.map(mat => (
              <div key={mat._id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>{mat.name}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '16px' }}>x{mat.quantity}</div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
                  {mat.source === 'guitar' ? (
                    <span className="badge badge-primary" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px' }}>🎸</span> Approved from Guitar
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '11px' }}>
                      Self Purchased / Owned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">No materials found.</div>}
      </div>
    </div>
  );
}
