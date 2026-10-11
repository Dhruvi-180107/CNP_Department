import { useState, useEffect, useRef } from 'react';
import { api, API_URL, getStoredToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserDisplay } from '../UserDisplay';

export function ClubManagement({ club, onUpdate }: { club: any, onUpdate: () => void }) {
  const clubId = club._id;
  const { user } = useAuth();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentId, setAddStudentId] = useState('');
  const [addMembershipType, setAddMembershipType] = useState('member');
  const [addPosition, setAddPosition] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [editName, setEditName] = useState(club.name);
  const [editDescription, setEditDescription] = useState(club.description);
  
  // Coordinator states
  const [availableCoordinators, setAvailableCoordinators] = useState<any[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState(typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId?._id || '' : club.facultyCoordinatorId || '');
  const [loadingCoordinators, setLoadingCoordinators] = useState(false);

  const loadRequests = async () => {
    try {
      const reqs = await api<any>('GET', `/join-requests/club/${clubId}`).then(res => res.data);
      setRequests(reqs.filter((r: any) => r.status === 'pending'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCoordinators = async () => {
    if (user?.role !== 'club_admin') return;
    setLoadingCoordinators(true);
    try {
      const users = await api<any>('GET', '/users').then(res => res.data);
      setAvailableCoordinators(users.filter((u: any) => u.role === 'faculty_coordinator'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCoordinators(false);
    }
  };

  useEffect(() => {
    loadRequests();
    loadCoordinators();
  }, [clubId, user]);

  const handleUpdateDetails = async () => {
    setLoading(true);
    try {
      await api('PATCH', `/clubs/${clubId}`, { name: editName, description: editDescription });
      onUpdate();
      alert('Club details updated successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to update details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCoordinator = async () => {
    setLoading(true);
    try {
      await api('PATCH', `/clubs/${clubId}/coordinator`, { facultyCoordinatorId: selectedCoordinatorId || null });
      onUpdate();
      alert('Coordinator updated successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to update coordinator');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api('PATCH', `/join-requests/${id}/approve`);
      setRequests(requests.filter(r => r._id !== id));
      onUpdate();
      alert('Request approved');
    } catch (e: any) {
      alert(e.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api('PATCH', `/join-requests/${id}/reject`);
      setRequests(requests.filter(r => r._id !== id));
      alert('Request rejected');
    } catch (e: any) {
      alert(e.message || 'Failed to reject');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentId) return alert('Student ID is required');
    
    try {
      await api('POST', `/clubs/${clubId}/members`, {
        studentId: addStudentId,
        membershipType: addMembershipType,
        position: addMembershipType === 'core_team' ? addPosition : undefined
      });
      alert('Member added successfully');
      setAddStudentId('');
      setAddPosition('');
      setAddMembershipType('member');
      onUpdate();
    } catch (e: any) {
      alert(e.message || 'Failed to add member');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`${API_URL}/clubs/${clubId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload logo');
      
      alert('Logo updated successfully');
      window.location.reload(); // Refresh to show new logo everywhere
    } catch (error: any) {
      alert(error.message || 'Error uploading logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('coverImage', file);

      const res = await fetch(`${API_URL}/clubs/${clubId}/cover_image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload cover image');
      
      alert('Cover image updated successfully');
      window.location.reload(); // Refresh to show new cover everywhere
    } catch (error: any) {
      alert(error.message || 'Error uploading cover image');
    } finally {
      setUploadingCover(false);
      if (coverImageInputRef.current) coverImageInputRef.current.value = '';
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Pending Join Requests</h3>
        <div className="card-body" style={{ padding: 0 }}>
          {requests.length ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {requests.map(r => (
                <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--warn-soft)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {(r.studentId?.name || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>{r.studentId?.name || 'Unknown Student'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>{r.studentId?.email} • Requested {new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 16px' }} onClick={() => handleApprove(r._id)}>Approve</button>
                    <button className="btn btn-outline" style={{ padding: '6px 16px', color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }} onClick={() => handleReject(r._id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '32px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>No pending join requests.</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Add Member Manually</h3>
          <div className="card-body" style={{ padding: 0 }}>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Student ID (Object ID)" 
                value={addStudentId} 
                onChange={e => setAddStudentId(e.target.value)} 
                required 
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
              />
              <select 
                className="input" 
                value={addMembershipType} 
                onChange={e => setAddMembershipType(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
              >
                <option value="member">Member</option>
                <option value="core_team">Core Team</option>
              </select>
              {addMembershipType === 'core_team' && (
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Position (e.g. Technical Lead)" 
                  value={addPosition} 
                  onChange={e => setAddPosition(e.target.value)} 
                  required 
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              )}
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Add Member</button>
            </form>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Update Club Images</h3>
          <div className="card-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Upload a clear, high-resolution logo for your club.
              </p>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
              <button className="btn btn-outline" disabled={uploading} onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📷</span> {uploading ? 'Uploading...' : 'Choose Logo Image'}
              </button>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Upload a wide cover image to appear at the top of the club details page.
              </p>
              <input type="file" accept="image/*" ref={coverImageInputRef} onChange={handleCoverImageUpload} style={{ display: 'none' }} />
              <button className="btn btn-outline" disabled={uploadingCover} onClick={() => coverImageInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🖼️</span> {uploadingCover ? 'Uploading...' : 'Choose Cover Image'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {user?.role === 'club_admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Edit Club Details</h3>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Club Name</label>
                  <input 
                    type="text" 
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Description</label>
                  <textarea 
                    className="input"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', resize: 'vertical' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleUpdateDetails} disabled={loading} style={{ alignSelf: 'flex-start' }}>Save Changes</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Faculty Coordinator Assignment</h3>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '8px' }}>Current Coordinator</div>
                {club.facultyCoordinatorId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {(typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId.name : '?').charAt(0)}
                    </div>
                    <div>
                      <UserDisplay user={typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId : { name: club.facultyCoordinatorId }} />
                      {typeof club.facultyCoordinatorId === 'object' && <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{club.facultyCoordinatorId.email}</div>}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--warn)', fontWeight: 500 }}>No Coordinator Assigned</div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Assign / Reassign Coordinator</label>
                  <select 
                    className="input"
                    value={selectedCoordinatorId}
                    onChange={e => setSelectedCoordinatorId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px' }}
                    disabled={loadingCoordinators}
                  >
                    <option value="">-- No Coordinator --</option>
                    {availableCoordinators.map(fc => (
                      <option key={fc._id} value={fc._id}>{fc.name} ({fc.email})</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-outline" style={{ alignSelf: 'flex-start', color: 'var(--primary)', borderColor: 'var(--primary-soft)' }} onClick={handleAssignCoordinator} disabled={loading}>Update Assignment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
