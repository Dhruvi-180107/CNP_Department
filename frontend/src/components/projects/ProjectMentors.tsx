import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserDisplay } from '../UserDisplay';
import { UserSelect } from '../UserSelect';

interface ProjectMentorsProps {
  projectId: string;
  mentors?: any[];
  onMentorsChange?: (mentors: any[]) => void;
}

export function ProjectMentors({ projectId, mentors: propMentors, onMentorsChange }: ProjectMentorsProps) {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<any[]>(propMentors || []);
  const [loading, setLoading] = useState(!propMentors);
  const [error, setError] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

  useEffect(() => {
    if (propMentors) {
      setMentors(propMentors);
      setLoading(false);
    }
  }, [propMentors]);

  const loadMentors = () => {
    api<any>('GET', `/projects/${projectId}/mentors`)
      .then(res => {
        const data = res.data || [];
        setMentors(data);
        onMentorsChange?.(data);
      })
      .catch(err => {
        if (err.status !== 403) setError(err.message || 'Failed to load mentors');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!propMentors) {
      loadMentors();
    }
  }, [projectId]);

  const handleAddMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId) return;
    try {
      await api('POST', `/projects/${projectId}/mentors`, { mentorId: selectedMentorId });
      setSelectedMentorId('');
      loadMentors();
      alert('Mentor assigned successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to add mentor');
    }
  };

  const handleRemoveMentor = async (mentorId: string) => {
    if (!window.confirm('Remove this mentor?')) return;
    try {
      await api('DELETE', `/projects/${projectId}/mentors/${mentorId}`);
      loadMentors();
    } catch (e: any) {
      alert(e.message || 'Failed to remove mentor');
    }
  };

  const handleSetPrimary = async (mentorId: string) => {
    try {
      await api('PATCH', `/projects/${projectId}/mentors/${mentorId}/primary`);
      loadMentors();
    } catch (e: any) {
      alert(e.message || 'Failed to set primary mentor');
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>{error}</div>;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <h3 className="card-title" style={{ marginBottom: '20px' }}>Project Mentors</h3>
      <div className="card-body" style={{ padding: 0 }}>
        
        {user?.role === 'project_admin' && (
          <form onSubmit={handleAddMentor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: 'var(--bg-card-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <UserSelect
                  role="faculty_mentor"
                  value={selectedMentorId}
                  onChange={setSelectedMentorId}
                  placeholder="Search and select faculty mentor..."
                  disabledUserIds={mentors.map(m => (typeof m.mentorId === 'object' ? m.mentorId?._id : m.mentorId)).filter(Boolean)}
                  disabledReason="Already assigned"
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!selectedMentorId}
                style={{ whiteSpace: 'nowrap', height: '42px', padding: '0 20px', alignSelf: 'flex-start' }}
              >
                Add Mentor
              </button>
            </div>
          </form>
        )}

        {mentors.length ? (
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {mentors.map(m => {
              const userObj = m.mentorId;
              return (
                <div key={m.assignmentId || m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {userObj.profileImage ? (
                      <img src={userObj.profileImage} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt={userObj.name} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {userObj.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <UserDisplay user={userObj} showEmail={false} />
                      <div style={{ marginTop: '4px' }}>
                        <span className="badge" style={{ fontSize: '11px', background: m.isPrimary ? 'var(--primary-glow)' : 'var(--bg)', color: m.isPrimary ? 'var(--primary)' : 'var(--text-faint)', border: m.isPrimary ? '1px solid rgba(var(--primary-rgb), 0.2)' : '1px solid var(--border)' }}>
                          {m.isPrimary ? 'Primary Mentor' : 'Secondary Mentor'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {user?.role === 'project_admin' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!m.isPrimary && (
                        <button className="btn btn-sm btn-outline" onClick={() => handleSetPrimary(userObj._id)}>Set Primary</button>
                      )}
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }} onClick={() => handleRemoveMentor(userObj._id)}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <div className="empty-state">No mentors assigned yet.</div>}
      </div>
    </div>
  );
}
