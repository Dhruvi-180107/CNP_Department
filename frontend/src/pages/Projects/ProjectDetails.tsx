import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ProjectMentors } from '../../components/projects/ProjectMentors';
import { ProjectMaterials } from '../../components/projects/ProjectMaterials';
import { ProjectMaterialRequests } from '../../components/projects/ProjectMaterialRequests';
import { ProjectUpdates } from '../../components/projects/ProjectUpdates';
import { ProjectManagement } from '../../components/projects/ProjectManagement';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const p = await api<any>('GET', `/projects`).then(res => res.data.find((x: any) => x._id === id));
      if (!p) throw new Error("Not found");
      setProject(p);
      
      const mems = await api<any>('GET', `/projects/${id}/members`).then(res => res.data);
      setMembers(mems);
      
      if (user?.role === 'student') {
        const reqs = await api<any>('GET', '/join-requests/student').then(res => res.data);
        const isMember = mems.some((m: any) => m.studentId._id === user._id);
        const hasPending = reqs.some((r: any) => r.projectId?._id === id && r.status === 'pending');
        if (isMember) setJoinStatus('member');
        else if (hasPending) setJoinStatus('pending');
        else setJoinStatus('none');
      }
    } catch (e) {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user, navigate]);

  const handleJoin = async () => {
    try {
      await api('POST', `/projects/${id}/join`);
      setJoinStatus('pending');
      alert('Join request sent successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to join');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setLoading(true);
      await api('POST', `/projects/${id}/image`, formData);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to upload project image');
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (!project) return null;

  const isTL = (m: any) => typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id === m.studentId._id : project.teamLeaderId === m.studentId._id;
  const currentUserIsTL = (typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id : project.teamLeaderId) === user?._id;

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn btn-sm btn-outline" style={{ marginBottom: '24px' }} onClick={() => navigate('/projects')}>← Back to Projects</button>
      
      {user?.role === 'project_admin' && (
        <ProjectManagement project={project} onUpdate={load} />
      )}

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ background: 'var(--bg)', height: '120px', position: 'relative' }}></div>
        <div style={{ padding: '0 32px 32px 32px', position: 'relative', marginTop: '-40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {project.image ? (
                <img src={project.image} style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover', border: '4px solid var(--surface)', background: 'var(--surface)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'white', border: '4px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📋</div>
              )}
              {user?.role === 'project_admin' && (
                <label style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--primary)', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, boxShadow: 'var(--shadow-sm)' }}>
                  ✎
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {user?.role === 'student' && (
                joinStatus === 'member' ? <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '13px' }}>Member</span>
                : joinStatus === 'pending' ? <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '8px 16px', fontSize: '13px' }}>Request Pending</span>
                : <button className="btn btn-primary" onClick={handleJoin}>Join Project</button>
              )}
            </div>
          </div>
          
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text)' }}>{project.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span className={`badge ${project.status === 'active' ? 'badge-success' : 'badge-student'}`}>{project.status}</span>
          </div>
          
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{project.description}</p>
        </div>
      </div>
      
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '20px' }}>Project Team</h3>
        <div className="card-body" style={{ padding: 0 }}>
          {members.length ? (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {members.map(m => (
                <div key={m._id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
                  border: isTL(m) ? '1px solid var(--warn-soft)' : '1px solid var(--border)', 
                  borderRadius: '12px', 
                  background: 'var(--bg-card-2)',
                  boxShadow: isTL(m) ? '0 4px 12px rgba(var(--warn-rgb), 0.05)' : 'none'
                }}>
                  {m.studentId.profileImage ? (
                    <img src={m.studentId.profileImage} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{m.studentId.name.charAt(0)}</div>
                  )}
                  <div>
                    <UserDisplay user={m.studentId} showEmail={false} showDepartment={false} showSemester={false} />
                    <div style={{ fontSize: '12px', color: isTL(m) ? 'var(--warn)' : 'var(--text-faint)', fontWeight: isTL(m) ? 600 : 400, marginTop: '4px' }}>
                      {isTL(m) ? 'Team Leader' : 'Team Member'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state">No members yet.</div>}
        </div>
      </div>

      <ProjectMentors projectId={project._id} />
      <ProjectMaterials projectId={project._id} />
      <ProjectMaterialRequests projectId={project._id} />
      <ProjectUpdates projectId={project._id} isTL={currentUserIsTL} />
    </div>
  );
}
