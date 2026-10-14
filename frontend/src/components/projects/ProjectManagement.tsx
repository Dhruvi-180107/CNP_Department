import { useState, useEffect } from 'react';
import { UserDisplay } from '../UserDisplay';
import { UserSelect } from '../UserSelect';
import { api } from '../../services/api';

export function ProjectManagement({ project, onUpdate }: { project: any, onUpdate: () => void }) {
  const [status, setStatus] = useState(project.status);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description);
  
  const [loading, setLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    setStatus(project.status);
    setEditName(project.name);
    setEditDescription(project.description);
    loadMembers();
  }, [project]);

  const loadMembers = async () => {
    try {
      const res = await api<any>('GET', `/projects/${project._id}/members`);
      setMembers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDetails = async () => {
    setLoading(true);
    try {
      await api('PATCH', `/projects/${project._id}`, { name: editName, description: editDescription });
      await api('PATCH', `/projects/${project._id}/status`, { status });
      onUpdate();
      alert('Project details updated successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to update details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      await api('POST', `/projects/${project._id}/members`, { studentId: selectedStudentId });
      setSelectedStudentId('');
      loadMembers();
      onUpdate(); // trigger global reload for members in parent
      alert('Student added successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/projects/${project._id}/members/${studentId}`);
      loadMembers();
      onUpdate();
      alert('Member removed');
    } catch (e: any) {
      alert(e.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleSetTeamLeader = async (studentId: string) => {
    if (!window.confirm('Set this student as the Team Leader? This will replace the current Team Leader.')) return;
    setLoading(true);
    try {
      await api('PATCH', `/projects/${project._id}/team-leader`, { studentId });
      onUpdate();
      alert('Team Leader updated');
    } catch (e: any) {
      alert(e.message || 'Failed to set team leader');
    } finally {
      setLoading(false);
    }
  };

  const isTL = (m: any) => typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id === m.studentId._id : project.teamLeaderId === m.studentId._id;
  const tlMember = members.find(m => isTL(m));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* EDIT PROJECT DETAILS */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Edit Project Details</h3>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Project Name</label>
                <input 
                  type="text" 
                  className="input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Project Status</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
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

        {/* TEAM MANAGEMENT */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Team Management</h3>
          <div className="card-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* CURRENT TL DISPLAY */}
            <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '8px' }}>Current Team Leader</div>
              {tlMember ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {tlMember.studentId.name.charAt(0)}
                  </div>
                  <div>
                    <UserDisplay user={tlMember.studentId} />
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--warn)', fontWeight: 500 }}>No Team Leader Assigned</div>
              )}
            </div>

            {/* ADD MEMBER */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Add Project Member</label>
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <UserSelect
                    role="student"
                    value={selectedStudentId}
                    onChange={(id) => setSelectedStudentId(id)}
                    disabledUserIds={members.map((m: any) => m.studentId?._id || m.studentId)}
                    disabledReason="Already a member"
                    placeholder="Search student by name, email, or department..."
                    emptyMessage="No registered students found"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-outline"
                  disabled={loading || !selectedStudentId}
                  style={{
                    color: 'var(--primary)',
                    borderColor: 'var(--primary-soft)',
                    height: '44px',
                    padding: '0 20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Add
                </button>
              </form>
            </div>

            {/* MEMBERS LIST */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '13px' }}>Manage Members</label>
              {members.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {members.map(m => (
                    <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                      <div>
                        <UserDisplay user={m.studentId} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isTL(m) && (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => handleSetTeamLeader(m.studentId._id)} disabled={loading}>Set TL</button>
                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => handleRemoveMember(m.studentId._id)} disabled={loading}>Remove</button>
                          </>
                        )}
                        {isTL(m) && <span className="badge badge-primary">TL</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state" style={{ padding: '16px' }}>No members yet.</div>}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
