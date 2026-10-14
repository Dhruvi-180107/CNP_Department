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
import { ProjectJoinRequests } from '../../components/projects/ProjectJoinRequests';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await api<any>('GET', `/projects/${id}`);
      if (!res.data) throw new Error("Project not found");
      setProject(res.data);
      
      const [mems, ments] = await Promise.all([
        api<any>('GET', `/projects/${id}/members`).then(r => r.data).catch(() => []),
        api<any>('GET', `/projects/${id}/mentors`).then(r => r.data).catch(() => [])
      ]);
      setMembers(mems || []);
      setMentors(ments || []);
      
      if (user?.role === 'student') {
        const reqs = await api<any>('GET', '/join-requests/student').then(r => r.data).catch(() => []);
        const tlId = typeof res.data.teamLeaderId === 'object' ? res.data.teamLeaderId?._id : res.data.teamLeaderId;
        const isTL = tlId && user?._id && tlId === user._id;
        const isMember = (mems || []).some((m: any) => {
          const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
          return sId && user?._id && sId === user._id;
        }) || isTL;
        const hasPending = (reqs || []).some((r: any) => (r.projectId?._id || r.projectId) === id && r.status === 'pending');
        if (isMember) setJoinStatus('member');
        else if (hasPending) setJoinStatus('pending');
        else setJoinStatus('none');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?._id]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [loading]);

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

  if (error) {
    return (
      <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button className="btn btn-sm btn-outline" style={{ marginBottom: '24px' }} onClick={() => navigate('/projects')}>← Back to Projects</button>
        <div style={{ color: 'var(--danger)', padding: '20px', background: 'var(--danger-soft)', borderRadius: '12px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Error</h3>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const isTL = (m: any) => {
    const tlId = typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id : project.teamLeaderId;
    const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
    return tlId && sId && tlId === sId;
  };

  const projectTLId = typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id : project.teamLeaderId;
  const currentUserIsTL = !!(projectTLId && user?._id && projectTLId === user._id);

  const isMember = (members || []).some((m: any) => {
    const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
    return sId && user?._id && sId === user._id;
  }) || currentUserIsTL;

  const isAssignedMentor = user?.role === 'faculty_mentor' && (mentors || []).some((m: any) => {
    const mId = typeof m.mentorId === 'object' ? m.mentorId?._id : m.mentorId;
    return mId && user?._id && mId === user._id;
  });

  const isProjectAdmin = user?.role === 'project_admin';

  const canAccessProjectContent = isProjectAdmin || isAssignedMentor || isMember;

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
      
      <ProjectJoinRequests projectId={project._id} onUpdate={load} />

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

      <ProjectMentors 
        projectId={project._id} 
        mentors={mentors} 
        onMentorsChange={(updatedMentors) => setMentors(updatedMentors)} 
      />

      {canAccessProjectContent ? (
        <>
          <ProjectMaterials projectId={project._id} isTL={currentUserIsTL} />
          <ProjectMaterialRequests projectId={project._id} isTL={currentUserIsTL} />
          <ProjectUpdates 
            projectId={project._id} 
            projectName={project.name} 
            isTL={currentUserIsTL} 
            mentors={mentors}
          />
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', marginTop: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>
            Project Resources Restricted
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '540px', marginInline: 'auto' }}>
            {user?.role === 'student'
              ? 'Project updates, materials, and material requests are accessible to project team members. Submit a join request above to participate in this project.'
              : user?.role === 'faculty_mentor'
              ? 'You are not assigned as a mentor for this project. Only assigned mentors and project administrators can access project updates, materials, and requests.'
              : 'Project materials, updates, and requests are restricted to assigned team members, mentors, and project administrators.'}
          </p>
        </div>
      )}
    </div>
  );
}
