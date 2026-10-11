import { useEffect, useState } from 'react';
import { UserDisplay } from '../UserDisplay';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function ProjectUpdates({ projectId, isTL }: { projectId: string, isTL?: boolean }) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackInput, setFeedbackInput] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDesc, setUpdateDesc] = useState('');
  const [updateFiles, setUpdateFiles] = useState<FileList | null>(null);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [updRes, fbRes] = await Promise.all([
          api<any>('GET', `/projects/${projectId}/updates`).catch(e => {
            if (e.status !== 403) throw e;
            return { data: [] };
          }),
          api<any>('GET', `/projects/${projectId}/feedback`).catch(e => {
            if (e.status !== 403) throw e;
            return { data: [] };
          })
        ]);
        setUpdates(updRes.data || []);
        setFeedback(fbRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load updates/feedback');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const handleFeedbackSubmit = async (updateId: string) => {
    const text = feedbackInput[updateId];
    if (!text?.trim()) return;

    try {
      setSubmitting(true);
      await api('POST', `/projects/${projectId}/feedback`, {
        updateId,
        feedbackText: text
      });
      alert('Feedback submitted successfully');
      setFeedbackInput(prev => ({ ...prev, [updateId]: '' }));
      
      // Reload feedback
      const fbRes = await api<any>('GET', `/projects/${projectId}/feedback`);
      setFeedback(fbRes.data || []);
    } catch (e: any) {
      alert(e.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateDesc.trim()) return;

    try {
      setSubmittingUpdate(true);
      const formData = new FormData();
      formData.append('title', updateTitle);
      formData.append('description', updateDesc);
      
      if (updateFiles) {
        for (let i = 0; i < updateFiles.length; i++) {
          formData.append('files', updateFiles[i]);
        }
      }

      await api('POST', `/projects/${projectId}/updates`, formData);
      alert('Update submitted successfully');
      setShowUpdateForm(false);
      setUpdateTitle('');
      setUpdateDesc('');
      setUpdateFiles(null);
      
      const updRes = await api<any>('GET', `/projects/${projectId}/updates`);
      setUpdates(updRes.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to submit update');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>{error}</div>;

  const isMentor = user?.role === 'faculty_mentor';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Project Updates & Timeline</h3>
        {isTL && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpdateForm(!showUpdateForm)}>
            {showUpdateForm ? 'Cancel Update' : 'Post Update'}
          </button>
        )}
      </div>

      {showUpdateForm && (
        <form onSubmit={handleUpdateSubmit} style={{ marginBottom: '24px', background: 'var(--bg-card-2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Update Title</label>
            <input 
              type="text" 
              className="input" 
              value={updateTitle} 
              onChange={e => setUpdateTitle(e.target.value)} 
              required 
              disabled={submittingUpdate} 
              style={{ width: '100%', padding: '10px' }} 
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Detailed Description</label>
            <textarea 
              className="input" 
              value={updateDesc} 
              onChange={e => setUpdateDesc(e.target.value)} 
              required 
              disabled={submittingUpdate} 
              rows={4} 
              style={{ width: '100%', padding: '10px', resize: 'vertical' }} 
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Attachments (optional, up to 5 files)</label>
            <input 
              type="file" 
              multiple 
              onChange={e => setUpdateFiles(e.target.files)} 
              disabled={submittingUpdate} 
              style={{ fontSize: '13px' }} 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submittingUpdate}>
            {submittingUpdate ? 'Submitting...' : 'Submit Update'}
          </button>
        </form>
      )}
      <div className="card-body" style={{ padding: 0 }}>
        {updates.length ? (
          <div style={{ position: 'relative', paddingLeft: '16px' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '23px', width: '2px', background: 'var(--border)' }}></div>
            {updates.map((upd, index) => (
              <div key={upd._id} style={{ position: 'relative', paddingLeft: '32px', paddingBottom: index === updates.length - 1 ? '0' : '32px' }}>
                <div style={{ position: 'absolute', left: '2px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '4px solid var(--surface)', zIndex: 1, boxShadow: '0 0 0 2px var(--primary-glow)' }}></div>
                
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text)' }}>{upd.title}</h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Submitted by: 
                          {upd.studentId ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {upd.studentId.profileImage ? (
                                <img src={upd.studentId.profileImage} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt={upd.studentId.name} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{upd.studentId.name.charAt(0)}</div>
                              )}
                              <UserDisplay user={upd.studentId} showEmail={false} showDepartment={false} showSemester={false} />
                            </div>
                          ) : <strong style={{ color: 'var(--text-muted)' }}>Unknown</strong>}
                        </div>
                        <span>•</span>
                        <span>{new Date(upd.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>{upd.description}</p>
                  
                  {upd.files && upd.files.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {upd.files.map((file: any, i: number) => (
                        <a key={i} href={file.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span style={{ color: 'var(--primary)' }}>📎</span> View File {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mentor Feedback</h5>
                    {feedback.filter(fb => fb.updateId?._id === upd._id).map(fb => (
                      <div key={fb._id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {fb.mentorId ? (
                              <>
                                {fb.mentorId.profileImage ? (
                                  <img src={fb.mentorId.profileImage} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt={fb.mentorId.name} />
                                ) : (
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{fb.mentorId.name.charAt(0)}</div>
                                )}
                                <UserDisplay user={fb.mentorId} showEmail={false} showDepartment={false} showSemester={false} />
                              </>
                            ) : <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>Mentor</div>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{new Date(fb.createdAt).toLocaleString()}</div>
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>{fb.feedbackText}</div>
                      </div>
                    ))}
                    {feedback.filter(fb => fb.updateId?._id === upd._id).length === 0 && (
                      <div style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic' }}>No feedback provided yet.</div>
                    )}
                    
                    {isMentor && (
                      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexDirection: 'column' }}>
                        <textarea 
                          value={feedbackInput[upd._id] || ''} 
                          onChange={e => setFeedbackInput(prev => ({ ...prev, [upd._id]: e.target.value }))}
                          placeholder="Provide actionable feedback..." 
                          rows={3} 
                          style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }}
                          disabled={submitting}
                        />
                        <button className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '8px 24px' }} onClick={() => handleFeedbackSubmit(upd._id)} disabled={submitting}>
                          Submit Feedback
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">No project updates yet.</div>}
      </div>
    </div>
  );
}
