import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { api } from '../../services/api';

export default function MaterialRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

  const loadRequests = async () => {
    try {
      const res = await api<any>('GET', '/material-requests');
      setRequests(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this request? This will deduct inventory and allocate the material to the project.')) return;
    try {
      await api('PATCH', `/material-requests/${id}/approve`);
      loadRequests();
    } catch (e: any) {
      alert(e.message || 'Failed to approve');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectReason.trim()) return;
    
    try {
      await api('PATCH', `/material-requests/${rejectingId}/reject`, { rejectionReason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      loadRequests();
    } catch (e: any) {
      alert(e.message || 'Failed to reject');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    return r.status !== 'pending';
  });

  if (loading) return <div className="spinner" style={{ margin: '40px auto', display: 'block' }}></div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Material Requests</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Review and manage guitar inventory requests from projects.</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '24px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)' }}>
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`} 
          onClick={() => setActiveTab('pending')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'pending' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'pending' ? 'var(--primary)' : 'var(--text-faint)', fontWeight: activeTab === 'pending' ? 600 : 500, cursor: 'pointer' }}
        >
          Pending Requests
        </button>
        <button 
          className={`tab ${activeTab === 'resolved' ? 'active' : ''}`} 
          onClick={() => setActiveTab('resolved')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'resolved' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'resolved' ? 'var(--primary)' : 'var(--text-faint)', fontWeight: activeTab === 'resolved' ? 600 : 500, cursor: 'pointer' }}
        >
          Resolved
        </button>
      </div>

      {filteredRequests.length ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredRequests.map(r => {
            const statusColors: any = {
              'pending': { bg: 'var(--warn-soft)', color: 'var(--warn)', label: 'Pending' },
              'approved': { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Approved' },
              'rejected': { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Rejected' },
            };
            const statusStyle = statusColors[r.status] || statusColors['pending'];
            
            return (
              <div key={r._id} className="card" style={{ padding: '24px', borderLeft: `4px solid ${statusStyle.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>
                      {r.materialName} <span style={{ color: 'var(--text-faint)', fontWeight: 'normal', fontSize: '16px' }}>&times; {r.quantity}</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--primary)' }}>📁</span> 
                        <span style={{ fontWeight: 500 }}>{r.projectId?.name || 'Unknown Project'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--primary)' }}>👤</span> 
                        {r.requestedBy ? <UserDisplay user={r.requestedBy} /> : 'Unknown Requester'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--primary)' }}>🕒</span> 
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, padding: '8px 16px', fontSize: '13px' }}>
                    {statusStyle.label}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-card-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, marginBottom: r.status === 'pending' || r.status === 'rejected' ? '20px' : '0' }}>
                  <div style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>Reason for request:</strong> {r.reason}</div>
                  
                  {r.status === 'rejected' && r.rejectionReason && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', color: 'var(--danger)' }}>
                      <strong>Rejection Reason:</strong> {r.rejectionReason}
                    </div>
                  )}
                </div>

                {r.status === 'pending' && rejectingId !== r._id && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => setRejectingId(r._id)}>Reject Request</button>
                    <button className="btn btn-primary" onClick={() => handleApprove(r._id)}>Approve Allocation</button>
                  </div>
                )}

                {rejectingId === r._id && (
                  <form onSubmit={handleReject} style={{ background: 'var(--danger-soft)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ color: 'var(--danger)', margin: '0 0 12px 0', fontSize: '15px' }}>Reject Request</h4>
                    <textarea 
                      className="input" 
                      rows={3} 
                      placeholder="Please provide a reason for rejecting this request..." 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)} 
                      required
                      style={{ width: '100%', marginBottom: '16px', background: 'var(--surface)', borderColor: 'var(--border)', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}>Confirm Rejection</button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          No {activeTab} material requests.
        </div>
      )}
    </div>
  );
}
