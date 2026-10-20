import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClubManagement } from '../../components/clubs/ClubManagement';
import { MemberItem } from '../../components/clubs/MemberItem';
import { EventCard } from '../../components/events/EventCard';
import { EventForm } from '../../components/events/EventForm';
import { isEventPast, useLocalDay } from '../../eventDate';
import { usePageLoading } from '../../context/LoadingContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function ClubDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPageLoading } = usePageLoading();
  const today = useLocalDay();
  
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [clubEventTab, setClubEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);

  const loadClubAndMembers = async () => {
    setPageLoading(true);
    try {
      const c = await api<any>('GET', `/clubs`).then(res => res.data.find((x: any) => x._id === id));
      if (!c) throw new Error("Not found");
      setClub(c);
      
      const mems = await api<any>('GET', `/clubs/${id}/members`).then(res => res.data);
      setMembers(mems);

      const evts = await api<any>('GET', `/clubs/${id}/events`).then(res => res.data).catch(() => []);
      const clubEvts = evts.filter((e: any) => {
        const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
        return !eClubId || eClubId === id;
      });
      const upcoming = clubEvts
        .filter((e: any) => !isEventPast(e.eventDate || e.date))
        .sort((a: any, b: any) => new Date(a.eventDate || a.date).getTime() - new Date(b.eventDate || b.date).getTime());
      const past = clubEvts
        .filter((e: any) => isEventPast(e.eventDate || e.date))
        .sort((a: any, b: any) => new Date(b.eventDate || b.date).getTime() - new Date(a.eventDate || a.date).getTime());
      setUpcomingEvents(upcoming);
      setPastEvents(past);
      
      if (user?.role === 'student') {
        const reqs = await api<any>('GET', '/join-requests/student').then(res => res.data);
        const isMember = mems.some((m: any) => m.studentId._id === user._id);
        const hasPending = reqs.some((r: any) => r.clubId?._id === id && r.status === 'pending');
        if (isMember) setJoinStatus('member');
        else if (hasPending) setJoinStatus('pending');
        else setJoinStatus('none');
      }
    } catch (e: any) {
      alert('Error loading club details: ' + (e.message || 'Not found'));
      navigate('/clubs');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadClubAndMembers();
  }, [id, user, navigate, today]);

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
      await api('POST', `/clubs/${id}/join`);
      setJoinStatus('pending');
      alert('Join request sent successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to join');
    }
  };

  if (loading) return <LoadingScreen isReady={!loading} />;
  if (!club) return null;

  const isCoordinator = user?.role === 'faculty_coordinator' && 
    (typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId?._id : club.facultyCoordinatorId) === user?._id;
  const isClubAdmin = user?.role === 'club_admin';
  const canManage = isCoordinator || isClubAdmin;

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn btn-sm btn-outline" style={{ marginBottom: '24px' }} onClick={() => navigate('/clubs')}>← Back to Clubs</button>
      
      <div className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: '24px' }}>
        {club.coverImage ? (
          <img src={club.coverImage} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} alt={`${club.name} Cover`} />
        ) : (
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', height: '160px', position: 'relative' }}></div>
        )}
        <div style={{ padding: '0 32px 32px 32px', position: 'relative', marginTop: '-40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {club.logo ? (
                <img src={club.logo} style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover', border: '4px solid var(--surface)', background: 'var(--surface)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'white', border: '4px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏛</div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {user?.role === 'student' && (
                joinStatus === 'member' ? <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '13px' }}>Member</span>
                : joinStatus === 'pending' ? <span className="badge badge-student" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '8px 16px', fontSize: '13px' }}>Request Pending</span>
                : <button className="btn btn-primary" onClick={handleJoin}>Join Club</button>
              )}
              {isCoordinator && <span className="badge" style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', fontSize: '13px' }}>Your Assigned Club</span>}
              {isClubAdmin && <span className="badge" style={{ background: '#8b5cf6', color: 'white', padding: '8px 16px', fontSize: '13px' }}>Admin View</span>}
            </div>
          </div>
          
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text)' }}>{club.name}</h1>
          
          {club.facultyCoordinatorId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card-2)' }}>
              {typeof club.facultyCoordinatorId === 'object' && club.facultyCoordinatorId?.profileImage ? (
                <img src={club.facultyCoordinatorId.profileImage} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt={club.facultyCoordinatorId.name} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId?.name?.charAt(0) : 'F'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Faculty Coordinator</div>
                {typeof club.facultyCoordinatorId === 'object' ? (
                  <UserDisplay user={club.facultyCoordinatorId} />
                ) : (
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>{club.facultyCoordinatorId}</div>
                )}
              </div>
            </div>
          )}
          
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{club.description}</p>
          
          {club.images && club.images.length > 0 && (
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {club.images.map((img: any, i: number) => (
                <img 
                  key={i} 
                  src={typeof img === 'string' ? img : img.url} 
                  alt={`${club.name} image ${i + 1}`} 
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)' }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {canManage && <ClubManagement club={club} onUpdate={loadClubAndMembers} />}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Club Events</h3>
            <span className="badge badge-success">{upcomingEvents.length} upcoming</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${clubEventTab === 'upcoming' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setClubEventTab('upcoming')}
              >
                Upcoming ({upcomingEvents.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${clubEventTab === 'past' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setClubEventTab('past')}
              >
                Past ({pastEvents.length})
              </button>
            </div>

            {canManage && !showEventForm && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setEditingEvent(null);
                  setShowEventForm(true);
                }}
              >
                + Add Event
              </button>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {showEventForm ? (
            <div style={{ marginBottom: '16px' }}>
              <EventForm
                clubId={id!}
                event={editingEvent}
                onSave={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  loadClubAndMembers();
                }}
                onCancel={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                }}
              />
            </div>
          ) : (
            <div>
              {(clubEventTab === 'upcoming' ? upcomingEvents : pastEvents).length > 0 ? (
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {(clubEventTab === 'upcoming' ? upcomingEvents : pastEvents).map(e => (
                    <EventCard
                      key={e._id}
                      event={{
                        ...e,
                        clubId: typeof e.clubId === 'object' && e.clubId ? e.clubId : club,
                      }}
                      canManage={canManage}
                      isPast={clubEventTab === 'past'}
                      onEdit={evt => {
                        setEditingEvent(evt);
                        setShowEventForm(true);
                      }}
                      onDelete={async (eventId) => {
                        if (!window.confirm('Are you sure you want to delete this event?')) return;
                        try {
                          await api('DELETE', `/events/${eventId}`);
                          setUpcomingEvents(prev => prev.filter(x => x._id !== eventId));
                          setPastEvents(prev => prev.filter(x => x._id !== eventId));
                        } catch (err: any) {
                          alert(err.message || 'Failed to delete event');
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="empty-state"
                  style={{
                    padding: '24px',
                    border: '1px dashed var(--border)',
                    borderRadius: '12px',
                    background: 'var(--surface)',
                    textAlign: 'center',
                  }}
                >
                  No {clubEventTab} events for this club.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '20px' }}>Core Team</h3>
        <div className="card-body" style={{ padding: 0, marginBottom: '32px' }}>
          {members.filter(m => m.membershipType === 'core_team').length ? (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {members.filter(m => m.membershipType === 'core_team').map(m => (
                <div key={m._id} style={{ padding: '16px', border: '1px solid var(--warn-soft)', borderRadius: '12px', background: 'var(--bg-card-2)', boxShadow: '0 4px 12px rgba(var(--warn-rgb), 0.05)' }}>
                  <MemberItem 
                    m={m} 
                    clubId={club._id} 
                    canManage={isCoordinator || user?.role === 'club_admin'} 
                    onRefresh={loadClubAndMembers} 
                  />
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>No core team assigned yet.</div>}
        </div>

        <h3 className="card-title" style={{ marginBottom: '20px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>Club Members</h3>
        <div className="card-body" style={{ padding: 0 }}>
          {members.filter(m => m.membershipType !== 'core_team').length ? (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {members.filter(m => m.membershipType !== 'core_team').map(m => (
                <div key={m._id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card-2)' }}>
                  <MemberItem 
                    m={m} 
                    clubId={club._id} 
                    canManage={isCoordinator || user?.role === 'club_admin'} 
                    onRefresh={loadClubAndMembers} 
                  />
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>No regular members yet.</div>}
        </div>
      </div>
    </div>
  );
}
