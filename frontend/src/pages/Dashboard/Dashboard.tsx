import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { UserDisplay } from '../../components/UserDisplay';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Student State
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  
  // FC State
  const [assignedClub, setAssignedClub] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // FM State
  const [mentorProjects, setMentorProjects] = useState<any[]>([]);
  
  // Club Admin State
  const [clubAdminStats, setClubAdminStats] = useState<any>(null);
  const [clubAdminRequests, setClubAdminRequests] = useState<any[]>([]);

  // Project Admin State
  const [projectAdminStats, setProjectAdminStats] = useState<any>(null);
  const [projectAdminRequests, setProjectAdminRequests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === 'student') {
          const [clubs, projects] = await Promise.all([
            api<any>('GET', '/clubs').then(res => res.data),
            api<any>('GET', `/users/${user._id}/projects`).then(res => res.data.map((d: any) => d.project))
          ]);
          
          const memberships = [];
          for (const c of clubs) {
            const mems = await api<any>('GET', `/clubs/${c._id}/members`).then(res => res.data);
            const me = mems.find((m: any) => m.studentId._id === user._id);
            if (me) memberships.push({ club: c, membership: me });
          }
          setMyClubs(memberships);
          setMyProjects(projects);
        } else if (user?.role === 'faculty_coordinator') {
          const allClubs = await api<any>('GET', '/clubs').then(res => res.data);
          const fcClub = allClubs.find((c: any) => 
            (typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId?._id : c.facultyCoordinatorId) === user._id
          );
          setAssignedClub(fcClub);

          if (fcClub) {
            const [reqs, evts, mems] = await Promise.all([
              api<any>('GET', `/join-requests/club/${fcClub._id}`).then(res => res.data),
              api<any>('GET', `/events/upcoming`).then(res => res.data.filter((e: any) => e.clubId?._id === fcClub._id || e.clubId === fcClub._id)),
              api<any>('GET', `/clubs/${fcClub._id}/members`).then(res => res.data).catch(() => [])
            ]);
            setPendingRequests(reqs.filter((r: any) => r.status === 'pending'));
            setUpcomingEvents(evts);
            setClubMembers(mems);
          }
          
          const notifs = await api<any>('GET', '/notifications').then(res => res.data);
          setUnreadNotifications(notifs.filter((n: any) => !n.isRead).length);

        } else if (user?.role === 'club_admin') {
          const allClubs = await api<any>('GET', '/clubs').then(res => res.data);
          const notifs = await api<any>('GET', '/notifications').then(res => res.data);
          const reqs = await api<any>('GET', '/join-requests/club/all').then(res => res.data).catch(() => []);
          
          setClubAdminRequests(reqs.filter((r: any) => r.status === 'pending'));
          
          setClubAdminStats({
            totalClubs: allClubs.length,
            withCoordinator: allClubs.filter((c: any) => c.facultyCoordinatorId).length,
            withoutCoordinator: allClubs.filter((c: any) => !c.facultyCoordinatorId).length,
          });
          setUnreadNotifications(notifs.filter((n: any) => !n.isRead).length);
        } else if (user?.role === 'faculty_mentor') {
          const mProjects = await api<any>('GET', `/mentors/${user._id}/projects`).then(res => res.data);
          setMentorProjects(mProjects);

          const notifs = await api<any>('GET', '/notifications').then(res => res.data);
          setUnreadNotifications(notifs.filter((n: any) => !n.isRead).length);
        } else if (user?.role === 'project_admin') {
          const [projects, matReqs, inventory, notifs, reqs] = await Promise.all([
            api<any>('GET', '/projects').then(res => res.data),
            api<any>('GET', '/material-requests').then(res => res.data).catch(() => []),
            api<any>('GET', '/inventory').then(res => res.data).catch(() => []),
            api<any>('GET', '/notifications').then(res => res.data).catch(() => []),
            api<any>('GET', '/join-requests/project/all').then(res => res.data).catch(() => [])
          ]);
          
          setProjectAdminStats({
            totalProjects: projects.length,
            activeProjects: projects.filter((p: any) => p.status === 'active').length,
            completedProjects: projects.filter((p: any) => p.status === 'completed').length,
            inactiveProjects: projects.filter((p: any) => p.status === 'inactive').length,
            withTeamLeader: projects.filter((p: any) => p.teamLeaderId).length,
            pendingMaterialRequests: matReqs.filter((r: any) => r.status === 'pending').length,
            inventoryItems: inventory.length
          });
          setProjectAdminRequests(reqs.filter((r: any) => r.status === 'pending'));
          setUnreadNotifications(notifs.filter((n: any) => !n.isRead).length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <h2 className="section-title">📊 Dashboard</h2>
      <p className="section-sub">Welcome back, {user?.name} ({user?.role})</p>
      
      {user?.role === 'student' && (
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Club Memberships</h3>
              <span className="badge badge-primary">{myClubs.length}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {myClubs.length ? myClubs.map(mc => (
                <div key={mc.club._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {mc.club.logo ? <img src={mc.club.logo} alt={mc.club.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏛</div>}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{mc.club.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: mc.membership.membershipType === 'core_team' ? 'var(--warn)' : 'var(--success)' }}></span>
                        {mc.membership.membershipType === 'core_team' ? `Core Team (${mc.membership.position || 'Member'})` : 'Member'}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => navigate(`/clubs/${mc.club._id}`)}>View</button>
                </div>
              )) : <div className="empty-state" style={{ padding: '32px' }}>Not a member of any clubs yet.</div>}
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Project Memberships</h3>
              <span className="badge badge-primary">{myProjects.length}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {myProjects.length ? myProjects.map(p => {
                const isTL = typeof p.teamLeaderId === 'object' ? p.teamLeaderId?._id === user._id : p.teamLeaderId === user._id;
                return (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {p.image ? <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📋</div>}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-student'}`} style={{ padding: '2px 6px', fontSize: '10px' }}>{p.status}</span>
                        {isTL ? <span style={{ color: 'var(--warn)', fontWeight: 500 }}>Team Leader</span> : <span>Member</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => navigate(`/projects/${p._id}`)}>View</button>
                </div>
              )
              }) : <div className="empty-state" style={{ padding: '32px' }}>Not assigned to any projects yet.</div>}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'faculty_coordinator' && (
        <div className="dashboard-grid">
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Assigned Club</h3>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {assignedClub ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>
                    {assignedClub.logo ? (
                      <img src={assignedClub.logo} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏛</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: 'var(--text)' }}>{assignedClub.name}</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-faint)', lineHeight: 1.5 }}>{assignedClub.description}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{clubMembers.filter(m => m.membershipType !== 'core_team').length}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Total Members</div>
                    </div>
                    <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--warn-soft)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warn)', marginBottom: '4px' }}>{clubMembers.filter(m => m.membershipType === 'core_team').length}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Core Team</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/clubs/${assignedClub._id}`)}>Manage Club</button>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>You are not assigned to any club.</div>
              )}
            </div>
          </div>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Pending Join Requests</h3>
              {assignedClub && pendingRequests.length > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>{pendingRequests.length}</span>}
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {assignedClub ? (
                pendingRequests.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {pendingRequests.slice(0, 3).map(r => (
                        <div key={r._id} style={{ border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--bg-card-2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }}></div>
                          {r.studentId ? <UserDisplay user={r.studentId} showEmail={false} /> : <div style={{ fontWeight: 500 }}>Unknown Student</div>}
                        </div>
                      ))}
                      {pendingRequests.length > 3 && <div style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>+ {pendingRequests.length - 3} more pending requests</div>}
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                      <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate(`/clubs/${assignedClub._id}`)}>Review Requests</button>
                    </div>
                  </div>
                ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>No pending requests.</div>
              ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>—</div>}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Upcoming Events</h3>
              {assignedClub && upcomingEvents.length > 0 && <span className="badge badge-success">{upcomingEvents.length}</span>}
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {assignedClub ? (
                upcomingEvents.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {upcomingEvents.slice(0, 3).map(e => (
                        <div key={e._id} style={{ border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-card-2)' }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>{e.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span>📅 {new Date(e.eventDate || e.date).toLocaleDateString()}</span>
                              <span>📍 {e.location}</span>
                            </div>
                            {e.eventLink && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🔗</span> <a href={e.eventLink} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{e.eventLinkName || 'Open Event Link'}</a>
                              </div>
                            )}
                            {e.relatedDocument?.url && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>📎</span> <a href={e.relatedDocument.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{e.relatedDocumentName || 'Open Related Document'}</a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                      <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/events')}>Manage Events</button>
                    </div>
                  </div>
                ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>No upcoming events.</div>
              ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>—</div>}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'faculty_mentor' && (
        <div className="dashboard-grid">
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Assigned Projects</h3>
              <span className="badge badge-primary">{mentorProjects.length}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {mentorProjects.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {mentorProjects.map(mp => {
                    const p = mp.project;
                    const tlObj = typeof p.teamLeaderId === 'object' ? p.teamLeaderId : null;
                    return (
                      <div key={mp.assignmentId} style={{ display: 'flex', flexDirection: 'column', padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📋</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-student'}`} style={{ padding: '2px 6px', fontSize: '11px' }}>{p.status}</span>
                              <span className="badge" style={{ background: mp.isPrimary ? 'var(--primary-glow)' : 'var(--bg)', color: mp.isPrimary ? 'var(--primary)' : 'var(--text-faint)', border: mp.isPrimary ? '1px solid rgba(var(--primary-rgb), 0.2)' : '1px solid var(--border)', fontSize: '11px' }}>
                                {mp.isPrimary ? 'Primary Mentor' : 'Secondary Mentor'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {tlObj && (
                          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {tlObj.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Team Leader</div>
                              <UserDisplay user={tlObj} showEmail={false} />
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 'auto' }}>
                          <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate(`/projects/${p._id}`)}>View Project Details</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="empty-state" style={{ padding: '40px', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border)' }}>You are not assigned to any projects yet.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Profile & Notifications</h3>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Unread Notifications</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Stay updated with your projects</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {unreadNotifications > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '6px 12px' }}>{unreadNotifications} New</span>}
                  <button className="btn btn-sm btn-outline" onClick={() => navigate('/notifications')}>View All</button>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <UserDisplay user={user} showEmail={false} />
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/profile')}>Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'club_admin' && clubAdminStats && (
        <div className="dashboard-grid">
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Club Administration</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{clubAdminStats.totalClubs}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total Clubs</div>
                </div>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--success-soft)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(var(--success-rgb), 0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>{clubAdminStats.withCoordinator}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>With Coordinator</div>
                </div>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--warn-soft)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(var(--warn-rgb), 0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warn)', marginBottom: '8px' }}>{clubAdminStats.withoutCoordinator}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Needs Coordinator</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={() => navigate('/clubs')}>Manage Clubs</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Pending Join Requests (All Clubs)</h3>
              {clubAdminRequests.length > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>{clubAdminRequests.length}</span>}
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {clubAdminRequests.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                    {clubAdminRequests.slice(0, 3).map(r => (
                      <div key={r._id} style={{ border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--bg-card-2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }}></div>
                        <div>
                          {r.studentId ? <UserDisplay user={r.studentId} showEmail={false} /> : <div style={{ fontWeight: 500 }}>Unknown Student</div>}
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Requested to join: {r.clubId?.name || 'Unknown Club'}</div>
                        </div>
                      </div>
                    ))}
                    {clubAdminRequests.length > 3 && <div style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>+ {clubAdminRequests.length - 3} more pending requests</div>}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/clubs')}>Manage via Clubs</button>
                  </div>
                </div>
              ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>No pending requests.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Profile & Notifications</h3>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Unread Notifications</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Stay updated with administrative alerts</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {unreadNotifications > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '6px 12px' }}>{unreadNotifications} New</span>}
                  <button className="btn btn-sm btn-outline" onClick={() => navigate('/notifications')}>View All</button>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <UserDisplay user={user} showEmail={false} />
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/profile')}>Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {user?.role === 'project_admin' && projectAdminStats && (
        <div className="dashboard-grid">
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Project Administration Overview</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{projectAdminStats.totalProjects}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total Projects</div>
                </div>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--success-soft)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(var(--success-rgb), 0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>{projectAdminStats.activeProjects}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Active Projects</div>
                </div>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--primary-soft)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>{projectAdminStats.withTeamLeader}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>With Team Leader</div>
                </div>
                <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--warn-soft)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(var(--warn-rgb), 0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warn)', marginBottom: '8px' }}>{projectAdminStats.pendingMaterialRequests}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Pending Mat. Requests</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/projects')}>Manage Projects</button>
                <button className="btn btn-outline" onClick={() => navigate('/inventory')}>Guitar Inventory</button>
                <button className="btn btn-outline" onClick={() => navigate('/material-requests')}>Material Requests</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Pending Join Requests</h3>
              {projectAdminRequests.length > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>{projectAdminRequests.length}</span>}
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {projectAdminRequests.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                    {projectAdminRequests.slice(0, 3).map(r => (
                      <div key={r._id} style={{ border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--bg-card-2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }}></div>
                        <div>
                          {r.studentId ? <UserDisplay user={r.studentId} showEmail={false} /> : <div style={{ fontWeight: 500 }}>Unknown Student</div>}
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Requested: {r.projectId?.name || 'Unknown Project'}</div>
                        </div>
                      </div>
                    ))}
                    {projectAdminRequests.length > 3 && <div style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>+ {projectAdminRequests.length - 3} more requests</div>}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/projects')}>Manage via Projects</button>
                  </div>
                </div>
              ) : <div className="empty-state" style={{ margin: 'auto', width: '100%' }}>No pending project requests.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">Profile & Notifications</h3>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Unread Notifications</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Stay updated with project alerts</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {unreadNotifications > 0 && <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '6px 12px' }}>{unreadNotifications} New</span>}
                  <button className="btn btn-sm btn-outline" onClick={() => navigate('/notifications')}>View All</button>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <UserDisplay user={user} showEmail={false} />
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/profile')}>Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
