import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { api } from '../../services/api';
import { usePageLoading } from '../../context/LoadingContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function MaterialRequests() {
  const { setPageLoading } = usePageLoading();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

  const loadRequests = async () => {
    try {
      setPageLoading(true);
      const res = await api<any>('GET', '/material-requests');
      setRequests(res.data || []);
    } catch (e: any) {
      console.error(e);
      setAlertMsg({ type: 'error', message: e.message || 'Failed to load material requests' });
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: any) => {
    const itemName = req.materialName || req.inventoryItemId?.name || 'Item';
    const currentStock = req.inventoryItemId?.availableQuantity ?? 0;

    if (req.quantity > currentStock) {
      if (!window.confirm(`Warning: Requested quantity (${req.quantity}) exceeds currently available stock (${currentStock}). Do you still wish to attempt approval?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Approve request for ${req.quantity}x "${itemName}" for project "${req.projectId?.name || 'project'}"?\n\nThis will deduct inventory stock exactly once and allocate it to the project.`)) {
        return;
      }
    }

    try {
      setActionLoading(req._id);
      setAlertMsg(null);
      await api('PATCH', `/material-requests/${req._id}/approve`);
      setAlertMsg({ type: 'success', message: `Successfully approved request for ${req.quantity}x "${itemName}".` });
      await loadRequests();
    } catch (e: any) {
      setAlertMsg({ type: 'error', message: e.message || 'Failed to approve request' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectReason.trim()) return;

    try {
      setActionLoading(rejectingId);
      setAlertMsg(null);
      await api('PATCH', `/material-requests/${rejectingId}/reject`, { rejectionReason: rejectReason.trim() });
      setRejectingId(null);
      setRejectReason('');
      setAlertMsg({ type: 'success', message: 'Material request rejected.' });
      await loadRequests();
    } catch (e: any) {
      setAlertMsg({ type: 'error', message: e.message || 'Failed to reject request' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    return r.status !== 'pending';
  });

  if (loading) return <LoadingScreen isReady={!loading} />;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Material Requests</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Review and manage Guitar inventory requests submitted by project Team Leaders.
          </p>
        </div>
      </div>

      {alertMsg && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: alertMsg.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
            color: alertMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${alertMsg.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{alertMsg.message}</span>
          <button
            type="button"
            onClick={() => setAlertMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: '24px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)' }}>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pending'); setRejectingId(null); }}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'pending' ? 'var(--primary)' : 'var(--text-faint)',
            fontWeight: activeTab === 'pending' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          Pending Requests ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={`tab ${activeTab === 'resolved' ? 'active' : ''}`}
          onClick={() => { setActiveTab('resolved'); setRejectingId(null); }}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'resolved' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'resolved' ? 'var(--primary)' : 'var(--text-faint)',
            fontWeight: activeTab === 'resolved' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          Resolved ({requests.filter(r => r.status !== 'pending').length})
        </button>
      </div>

      {filteredRequests.length ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredRequests.map(r => {
            const statusColors: any = {
              'pending': { bg: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', label: 'Pending Review' },
              'approved': { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', label: 'Approved' },
              'rejected': { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', label: 'Rejected' },
            };
            const statusStyle = statusColors[r.status] || statusColors['pending'];
            const materialDisplayName = r.materialName || r.inventoryItemId?.name || 'Guitar Component';
            const availableStock = r.inventoryItemId?.availableQuantity;

            return (
              <div
                key={r._id}
                className="card"
                style={{
                  padding: '24px',
                  borderLeft: `4px solid ${statusStyle.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
                        {materialDisplayName}
                      </h3>
                      <span
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text)',
                        }}
                      >
                        Requested: {r.quantity}
                      </span>
                      {availableStock != null && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: availableStock >= r.quantity ? 'var(--success)' : 'var(--danger)',
                            background: 'var(--bg-card-2)',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Available Stock: {availableStock}
                        </span>
                      )}
                      {r.inventoryItemId?.category && (
                        <span className="badge" style={{ fontSize: '11px', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                          {r.inventoryItemId.category}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', flexWrap: 'wrap' }}>
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
                        {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '20px',
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Specifications if any */}
                {r.specifications && (
                  <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                    <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Material Specifications / Description:
                    </strong>
                    <div style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>{r.specifications}</div>
                  </div>
                )}

                {/* Reason */}
                <div style={{ background: 'var(--bg-card-2)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>Reason for request: </strong>
                    {r.reason}
                  </div>
                </div>

                {/* Attachments Section */}
                {(r.imageUrl || r.documentUrl) && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {r.imageUrl && (
                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        <img
                          src={r.imageUrl}
                          alt="Component Preview"
                          style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <span>View Component Photo</span>
                      </a>
                    )}

                    {r.documentUrl && (
                      <a
                        href={r.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>📄</span>
                        <span>Reference Document {r.documentOriginalName ? `(${r.documentOriginalName})` : ''}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Rejection reason when resolved */}
                {r.status === 'rejected' && r.rejectionReason && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--danger)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '13px',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Rejection Reason:</strong>
                    {r.rejectionReason}
                  </div>
                )}

                {/* Reviewer info */}
                {r.status !== 'pending' && r.reviewedAt && (
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    Reviewed on {new Date(r.reviewedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    {r.reviewedBy?.name ? ` by ${r.reviewedBy.name}` : ''}
                  </div>
                )}

                {/* Actions for Pending Requests */}
                {r.status === 'pending' && rejectingId !== r._id && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
                      onClick={() => { setRejectingId(r._id); setRejectReason(''); }}
                      disabled={actionLoading === r._id}
                    >
                      Reject Request
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleApprove(r)}
                      disabled={actionLoading === r._id}
                    >
                      {actionLoading === r._id ? 'Approving...' : 'Approve & Allocate'}
                    </button>
                  </div>
                )}

                {/* Rejection Form Modal/Area */}
                {rejectingId === r._id && (
                  <form
                    onSubmit={handleReject}
                    style={{
                      background: 'rgba(239, 68, 68, 0.06)',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <h4 style={{ color: 'var(--danger)', margin: '0 0 8px 0', fontSize: '15px' }}>
                      Reject Request for {materialDisplayName}
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Please provide a clear reason for the rejection. This reason will be displayed to the Team Leader in their project history.
                    </p>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="e.g., Requested item is reserved for department lab, or please provide detailed circuit diagram..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        marginBottom: '16px',
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        disabled={actionLoading === r._id}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={actionLoading === r._id || !rejectReason.trim()}
                        style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}
                      >
                        {actionLoading === r._id ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          No {activeTab} material requests found.
        </div>
      )}
    </div>
  );
}
