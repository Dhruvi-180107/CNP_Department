import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EventForm } from '../../components/events/EventForm';

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadEvents = async () => {
    try {
      let evts = [];
      if (user?.role === 'faculty_coordinator') {
        const clubs = await api<any>('GET', '/clubs').then(res => res.data);
        const myClub = clubs.find((c: any) => 
          (typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId?._id : c.facultyCoordinatorId) === user._id
        );
        if (myClub) {
          setSelectedClubId(myClub._id);
          evts = await api<any>('GET', `/clubs/${myClub._id}/events`).then(res => res.data);
        } else {
          evts = await api<any>('GET', '/events/upcoming').then(res => res.data);
        }
      } else if (user?.role === 'club_admin') {
        const clubs = await api<any>('GET', '/clubs').then(res => res.data);
        setAllClubs(clubs);
        evts = await api<any>('GET', '/events').then(res => res.data);
      } else {
        evts = await api<any>('GET', '/events/upcoming').then(res => res.data);
      }
      setEvents(evts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api('DELETE', `/events/${id}`);
      setEvents(events.filter(e => e._id !== id));
      alert('Event deleted');
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  const now = new Date().getTime();

  let displayEvents = events;
  if (selectedDate) {
    displayEvents = events.filter(e => {
      const d = new Date(e.eventDate || e.date);
      return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
    });
  }

  const upcomingEvents = displayEvents.filter(e => new Date(e.eventDate || e.date).getTime() >= now).sort((a, b) => new Date(a.eventDate || a.date).getTime() - new Date(b.eventDate || b.date).getTime());
  const pastEvents = displayEvents.filter(e => new Date(e.eventDate || e.date).getTime() < now).sort((a, b) => new Date(b.eventDate || b.date).getTime() - new Date(a.eventDate || a.date).getTime());

  const canManageEvent = (e: any) => {
    if (user?.role === 'club_admin') return true;
    if (user?.role === 'faculty_coordinator' && selectedClubId) {
      const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return eClubId === selectedClubId;
    }
    return false;
  };

  const canAddEvent = user?.role === 'club_admin' || (user?.role === 'faculty_coordinator' && selectedClubId);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.eventDate || e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Events</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Discover and manage upcoming activities, workshops, and meetups.</p>
        </div>
        {canAddEvent && !showForm && (
          <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setShowForm(true); }}>
            + Create Event
          </button>
        )}
      </div>

      {showForm && canAddEvent && (
        <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
          {user?.role === 'club_admin' && !editingEvent && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>Select Club for Event</label>
              <select 
                className="input" 
                value={selectedClubId || ''} 
                onChange={e => setSelectedClubId(e.target.value)}
              >
                <option value="" disabled>Select a club...</option>
                {allClubs.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {(selectedClubId || editingEvent) ? (
            <EventForm 
              clubId={(editingEvent && typeof editingEvent.clubId === 'object' ? editingEvent.clubId._id : editingEvent?.clubId) || selectedClubId!} 
              event={editingEvent} 
              onSave={() => { setShowForm(false); loadEvents(); }} 
              onCancel={() => { setShowForm(false); setEditingEvent(null); }} 
            />
          ) : (
            <div style={{ color: 'var(--text-faint)' }}>Please select a club first.</div>
          )}
        </div>
      )}

      {/* Calendar View */}
      <div className="card" style={{ marginBottom: '40px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>&laquo; Prev</button>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent)' }}></span>
                Upcoming Event
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.2)' }}></span>
                Past Event
              </div>
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>Next &raquo;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px', paddingBottom: '8px', textAlign: 'center' }}>{d}</div>)}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} style={{ minHeight: '100px' }} />)}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month && selectedDate?.getDate() === day;
            const displayLimit = 2;
            const visibleEvents = dayEvents.slice(0, displayLimit);
            const extraCount = dayEvents.length - displayLimit;

            return (
              <div 
                key={day}
                onClick={() => {
                  const d = new Date(year, month, day);
                  setSelectedDate(isSelected ? null : d);
                }}
                style={{ 
                  padding: '8px', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s',
                  overflow: 'hidden'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text)', marginBottom: '4px' }}>
                  {day}
                </div>
                {visibleEvents.map(e => {
                  const isPast = new Date(e.eventDate || e.date).getTime() < now;
                  return (
                    <div 
                      key={e._id}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        const d = new Date(year, month, day);
                        setSelectedDate(d);
                      }}
                      style={{ 
                        fontSize: '11px', 
                        padding: '4px 6px', 
                        borderRadius: '4px', 
                        background: isPast ? 'rgba(100,116,139,0.12)' : 'var(--accent)', 
                        color: isPast ? 'var(--text-muted)' : '#fff', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        border: isPast ? '1px solid rgba(100,116,139,0.2)' : '1px solid var(--accent)',
                      }}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <div 
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, padding: '2px 4px', textAlign: 'center' }}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      const d = new Date(year, month, day);
                      setSelectedDate(d);
                    }}
                  >
                    +{extraCount} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {selectedDate && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button className="btn btn-sm btn-outline" onClick={() => setSelectedDate(null)}>Clear Filter</button>
          </div>
        )}
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
        {selectedDate ? `Events on ${selectedDate.toLocaleDateString()}` : 'Upcoming Events'}
      </h3>
      
      {upcomingEvents.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {upcomingEvents.map(e => (
            <div key={e._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>{e.title}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--accent)' }}>📅</span> {new Date(e.eventDate || e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(e.eventDate || e.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--warn)' }}>📍</span> {e.location}
                    </div>
                    {e.eventLink && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--accent)' }}>🔗</span> <a href={e.eventLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{e.eventLinkName || 'Open Event Link'}</a>
                      </div>
                    )}
                    {e.relatedDocument?.url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--success)' }}>📎</span> <a href={e.relatedDocument.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success)', textDecoration: 'none' }}>{e.relatedDocumentName || 'Open Related Document'}</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ flex: 1, marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{e.description}</p>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {e.clubId?.name ? <span className="badge badge-student" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{e.clubId.name}</span> : <div></div>}
                {canManageEvent(e) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditingEvent(e); setShowForm(true); }}>Edit</button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }} onClick={() => handleDelete(e._id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty-state" style={{ marginBottom: '40px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>No {selectedDate ? 'events' : 'upcoming events'} scheduled.</div>}

      {pastEvents.length > 0 && (
        <>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-faint)' }}></span>
            Past Events
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', opacity: 0.8 }}>
            {pastEvents.map(e => (
              <div key={e._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>{e.title}</h3>
                    <div style={{ color: 'var(--text-faint)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>📅 {new Date(e.eventDate || e.date).toLocaleDateString()} at {new Date(e.eventDate || e.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                      <div>📍 {e.location}</div>
                      {e.eventLink && (
                        <div>🔗 <a href={e.eventLink} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{e.eventLinkName || 'Open Event Link'}</a></div>
                      )}
                      {e.relatedDocument?.url && (
                        <div>📎 <a href={e.relatedDocument.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{e.relatedDocumentName || 'Open Related Document'}</a></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ flex: 1, marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted)' }}>{e.description}</p>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {e.clubId?.name ? <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-faint)' }}>{e.clubId.name}</span> : <div></div>}
                  {canManageEvent(e) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(e._id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
