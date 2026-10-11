import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProjectForm } from '../../components/projects/ProjectForm';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();

  const loadProjects = async () => {
    try {
      if (user?.role === 'faculty_mentor') {
        const res = await api<any>('GET', `/mentors/${user._id}/projects`);
        setProjects(res.data.map((m: any) => m.project));
      } else {
        const res = await api<any>('GET', '/projects');
        setProjects(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Projects Hub</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage and explore active hardware and software projects.</p>
        </div>
        {user?.role === 'project_admin' && !showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Project</button>
        )}
      </div>

      {showForm && (
        <ProjectForm onSave={() => { setShowForm(false); loadProjects(); }} onCancel={() => setShowForm(false)} />
      )}

      {loading ? <div className="spinner" style={{ margin: '40px auto', display: 'block' }}></div> : (
        projects.length ? (
          <div className="grid-2">
            {projects.map(p => {
              const tlObj = typeof p.teamLeaderId === 'object' ? p.teamLeaderId : null;
              return (
              <div key={p._id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }} onClick={() => navigate(`/projects/${p._id}`)}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📋</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-student'}`}>{p.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-body" style={{ flex: 1, marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                </div>

                {tlObj && (
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{tlObj.name.charAt(0)}</div>
                    <div style={{ fontSize: '13px' }}>
                      <div style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Team Leader</div>
                      <UserDisplay user={tlObj} showEmail={false} />
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        ) : <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>No projects available right now.</div>
      )}
    </div>
  );
}
