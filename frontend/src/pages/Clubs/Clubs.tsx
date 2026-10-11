import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ClubForm } from '../../components/clubs/ClubForm';

export default function Clubs() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Student specific state
  const [myMemberships, setMyMemberships] = useState<Record<string, any>>({});
  const [myPending, setMyPending] = useState<Record<string, boolean>>({});

  const loadClubs = async () => {
    try {
      const res = await api<any>('GET', '/clubs');
      const allClubs = res.data;
      setClubs(allClubs);

      if (user?.role === 'student') {
        const [reqs, ...memberships] = await Promise.all([
          api<any>('GET', '/join-requests/student').then(r => r.data),
          ...allClubs.map((c: any) => api<any>('GET', `/clubs/${c._id}/members`).then(r => ({ clubId: c._id, members: r.data })))
        ]);
        
        const pendingMap: Record<string, boolean> = {};
        reqs.forEach((r: any) => {
          if (r.status === 'pending' && r.clubId) {
            pendingMap[typeof r.clubId === 'object' ? r.clubId._id : r.clubId] = true;
          }
        });
        setMyPending(pendingMap);

        const memberMap: Record<string, any> = {};
        memberships.forEach((m: any) => {
          const me = m.members.find((x: any) => x.studentId._id === user._id);
          if (me) memberMap[m.clubId] = me;
        });
        setMyMemberships(memberMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, [user]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Student Clubs</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Explore, join, and manage university clubs and organizations.</p>
        </div>
        {user?.role === 'club_admin' && !showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Club</button>
        )}
      </div>

      {showForm && (
        <ClubForm 
          onSave={() => { setShowForm(false); loadClubs(); }} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      {loading ? <div className="spinner" style={{ margin: '40px auto', display: 'block' }}></div> : (
        clubs.length ? (
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {clubs.map(c => {
              const isMember = !!myMemberships[c._id];
              const isPending = !!myPending[c._id];
              
              return (
              <div key={c._id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }} onClick={() => navigate(`/clubs/${c._id}`)}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🏛</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</h3>
                    {user?.role === 'student' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isMember ? <span className="badge badge-success">Member</span>
                        : isPending ? <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>Request Pending</span>
                        : <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Join Club</span>}
                      </div>
                    )}
                    {user?.role === 'club_admin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>Manage</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card-body" style={{ flex: 1, marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>
                </div>

                {c.facultyCoordinatorId && (
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{c.facultyCoordinatorId.name.charAt(0)}</div>
                    <div style={{ fontSize: '13px' }}>
                      <div style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Faculty Coordinator</div>
                      <UserDisplay user={c.facultyCoordinatorId} showEmail={false} />
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        ) : <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>No clubs available.</div>
      )}
    </div>
  );
}
