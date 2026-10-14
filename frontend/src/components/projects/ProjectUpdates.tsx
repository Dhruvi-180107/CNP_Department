import { useEffect, useState } from 'react';
import { UserDisplay } from '../UserDisplay';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProjectUpdatesProps {
  projectId: string;
  projectName?: string;
  isTL?: boolean;
  mentors?: any[];
}

export function ProjectUpdates({ projectId, projectName: propProjectName, isTL, mentors: propMentors }: ProjectUpdatesProps) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>(propMentors || []);
  const [projectMeta, setProjectMeta] = useState<{ id?: string; name?: string; status?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propMentors) {
      setMentors(propMentors);
    }
  }, [propMentors]);

  // Update creation form state (Team Leader only)
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDesc, setUpdateDesc] = useState('');
  const [updateFiles, setUpdateFiles] = useState<FileList | null>(null);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Feedback form state
  const [activeFeedbackUpdateId, setActiveFeedbackUpdateId] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ [updateId: string]: string }>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<{ [updateId: string]: boolean }>({});
  const [feedbackErrors, setFeedbackErrors] = useState<{ [updateId: string]: string }>({});
  const [feedbackSuccess, setFeedbackSuccess] = useState<{ [updateId: string]: string }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const promises: [Promise<any>, Promise<any>, Promise<any>?] = [
          api<any>('GET', `/projects/${projectId}/updates`).catch(e => {
            if (e.status !== 403) throw e;
            return { data: [] };
          }),
          api<any>('GET', `/projects/${projectId}/feedback`).catch(e => {
            if (e.status !== 403) throw e;
            return { data: [] };
          })
        ];

        if (!propMentors) {
          promises.push(
            api<any>('GET', `/projects/${projectId}/mentors`).catch(() => ({ data: [] }))
          );
        }

        const [updRes, fbRes, mentorsRes] = await Promise.all(promises);
        setUpdates(updRes.data || []);
        setFeedback(fbRes.data || []);
        if (mentorsRes?.data) {
          setMentors(mentorsRes.data);
        }
        if (updRes.project) {
          setProjectMeta(updRes.project);
        } else if (fbRes.project) {
          setProjectMeta(fbRes.project);
        }
      } catch (err: any) {
        if (err.status !== 403) {
          setError(err.message || 'Failed to load updates/feedback');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  // Authorization checks
  const isProjectAdmin = user?.role === 'project_admin';
  const isAssignedMentor = user?.role === 'faculty_mentor' && mentors.some((m: any) => {
    const mentorUser = m.mentorId;
    const mId = typeof mentorUser === 'object' ? mentorUser?._id : mentorUser;
    return mId === user?._id;
  });
  const canGiveFeedback = isProjectAdmin || isAssignedMentor;
  const currentProjectName = propProjectName || projectMeta?.name || 'Project';

  const handleOpenFeedbackForm = (updateId: string) => {
    setActiveFeedbackUpdateId(updateId);
    setFeedbackErrors(prev => ({ ...prev, [updateId]: '' }));
    setFeedbackSuccess(prev => ({ ...prev, [updateId]: '' }));
  };

  const handleCancelFeedback = (updateId: string) => {
    setActiveFeedbackUpdateId(null);
    setFeedbackErrors(prev => ({ ...prev, [updateId]: '' }));
    setFeedbackSuccess(prev => ({ ...prev, [updateId]: '' }));
  };

  const handleFeedbackSubmit = async (updateId: string) => {
    const text = feedbackInput[updateId]?.trim();
    if (!text) {
      setFeedbackErrors(prev => ({ ...prev, [updateId]: 'Feedback text is required and cannot be empty.' }));
      return;
    }

    try {
      setSubmittingFeedback(prev => ({ ...prev, [updateId]: true }));
      setFeedbackErrors(prev => ({ ...prev, [updateId]: '' }));

      const res = await api<any>('POST', `/projects/${projectId}/feedback`, {
        updateId,
        feedbackText: text
      });

      // Update feedback section immediately without page reload
      if (res.data) {
        setFeedback(prev => [res.data, ...prev.filter(fb => fb._id !== res.data._id)]);
      }

      setFeedbackSuccess(prev => ({ ...prev, [updateId]: 'Feedback submitted successfully!' }));
      setFeedbackInput(prev => ({ ...prev, [updateId]: '' }));

      // Reload feedback in background to ensure complete server sync
      api<any>('GET', `/projects/${projectId}/feedback`).then(fbRes => {
        if (fbRes.data) {
          setFeedback(fbRes.data);
        }
      }).catch(() => {});

      // Close the form after a short delay so user sees success state
      setTimeout(() => {
        setActiveFeedbackUpdateId(current => current === updateId ? null : current);
        setFeedbackSuccess(prev => ({ ...prev, [updateId]: '' }));
      }, 1500);

    } catch (e: any) {
      setFeedbackErrors(prev => ({ ...prev, [updateId]: e.message || 'Failed to submit feedback' }));
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [updateId]: false }));
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
      if (updRes.project) setProjectMeta(updRes.project);
    } catch (err: any) {
      alert(err.message || 'Failed to submit update');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>{error}</div>;

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
            {updates.map((upd, index) => {
              const updateFeedbacks = feedback.filter(
                fb => (fb.updateId?._id === upd._id || fb.updateId === upd._id)
              );
              const hasFeedback = updateFeedbacks.length > 0;
              const isFormOpen = activeFeedbackUpdateId === upd._id;

              return (
                <div key={upd._id} id={`update-${upd._id}`} style={{ position: 'relative', paddingLeft: '32px', paddingBottom: index === updates.length - 1 ? '0' : '32px' }}>
                  <div style={{ position: 'absolute', left: '2px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '4px solid var(--surface)', zIndex: 1, boxShadow: '0 0 0 2px var(--primary-glow)' }}></div>
                  
                  <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text)' }}>{upd.title}</h4>
                        <div style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Submitted by:</span>
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
                    
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{upd.description}</p>
                    
                    {upd.files && upd.files.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {upd.files.map((file: any, i: number) => (
                          <a key={i} href={file.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ color: 'var(--primary)' }}>📎</span> View File {i + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Feedback Section */}
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Feedback {hasFeedback ? `(${updateFeedbacks.length})` : ''}
                        </h5>
                        {canGiveFeedback && !isFormOpen && hasFeedback && (
                          <button
                            id={`add-feedback-btn-${upd._id}`}
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenFeedbackForm(upd._id)}
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                          >
                            💬 Add Feedback
                          </button>
                        )}
                      </div>

                      {/* Feedback List */}
                      {hasFeedback ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {updateFeedbacks.map(fb => {
                            const authorRole = fb.mentorId?.role === 'project_admin'
                              ? 'Project Admin'
                              : fb.mentorId?.role === 'faculty_mentor'
                                ? 'Faculty Mentor'
                                : (fb.mentorId?.role || 'Mentor');
                            const roleBadgeClass = fb.mentorId?.role === 'project_admin' ? 'badge-admin' : 'badge-mentor';

                            return (
                              <div key={fb._id} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {fb.mentorId?.profileImage ? (
                                      <img src={fb.mentorId.profileImage} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt={fb.mentorId.name} />
                                    ) : (
                                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                        {fb.mentorId?.name ? fb.mentorId.name.charAt(0) : 'M'}
                                      </div>
                                    )}
                                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                                      {fb.mentorId?.name || 'Unknown Author'}
                                    </span>
                                    <span className={`badge ${roleBadgeClass}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                      {authorRole}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                                    {new Date(fb.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                  {fb.feedbackText}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                            No feedback yet
                          </div>
                          {canGiveFeedback && !isFormOpen && (
                            <button
                              id={`give-feedback-btn-${upd._id}`}
                              className="btn btn-sm btn-primary"
                              onClick={() => handleOpenFeedbackForm(upd._id)}
                              style={{ fontSize: '12px', padding: '6px 16px' }}
                            >
                              Give Feedback
                            </button>
                          )}
                        </div>
                      )}

                      {/* Feedback Form */}
                      {isFormOpen && (
                        <form
                          id={`feedback-form-${upd._id}`}
                          onSubmit={e => {
                            e.preventDefault();
                            handleFeedbackSubmit(upd._id);
                          }}
                          style={{
                            marginTop: '16px',
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                              {hasFeedback ? 'Add Additional Feedback' : 'Give Feedback'}
                            </h6>
                            <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                              {user?.role === 'project_admin' ? 'Project Admin' : 'Faculty Mentor'}
                            </span>
                          </div>

                          {/* Form Metadata */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px', padding: '10px 12px', background: 'var(--surface)', borderRadius: '8px', fontSize: '12px' }}>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '10px', display: 'block', letterSpacing: '0.5px' }}>Project</span>
                              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{currentProjectName}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '10px', display: 'block', letterSpacing: '0.5px' }}>Update Title</span>
                              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{upd.title}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '10px', display: 'block', letterSpacing: '0.5px' }}>Update Author</span>
                              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{upd.studentId?.name || 'Unknown'}</span>
                            </div>
                          </div>

                          {/* Success Message */}
                          {feedbackSuccess[upd._id] && (
                            <div style={{ color: 'var(--success)', padding: '10px 14px', background: 'var(--success-soft)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '12px', fontSize: '13px' }}>
                              ✓ {feedbackSuccess[upd._id]}
                            </div>
                          )}

                          {/* Error Message */}
                          {feedbackErrors[upd._id] && (
                            <div style={{ color: 'var(--danger)', padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '12px', fontSize: '13px' }}>
                              ⚠️ {feedbackErrors[upd._id]}
                            </div>
                          )}

                          {/* Feedback Textarea */}
                          <div style={{ marginBottom: '14px' }}>
                            <label htmlFor={`feedback-input-${upd._id}`} style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                              Feedback Text <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <textarea
                              id={`feedback-input-${upd._id}`}
                              className="input"
                              value={feedbackInput[upd._id] || ''}
                              onChange={e => {
                                setFeedbackInput(prev => ({ ...prev, [upd._id]: e.target.value }));
                                if (feedbackErrors[upd._id]) {
                                  setFeedbackErrors(prev => ({ ...prev, [upd._id]: '' }));
                                }
                              }}
                              placeholder="Provide actionable and constructive feedback..."
                              rows={4}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }}
                              disabled={submittingFeedback[upd._id]}
                              required
                            />
                          </div>

                          {/* Submit & Cancel Buttons */}
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              id={`submit-feedback-btn-${upd._id}`}
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={submittingFeedback[upd._id]}
                              style={{ minWidth: '120px' }}
                            >
                              {submittingFeedback[upd._id] ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                            <button
                              id={`cancel-feedback-btn-${upd._id}`}
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={submittingFeedback[upd._id]}
                              onClick={() => handleCancelFeedback(upd._id)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="empty-state">No project updates yet.</div>}
      </div>
    </div>
  );
}
