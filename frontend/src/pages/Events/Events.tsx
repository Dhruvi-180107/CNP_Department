import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EventForm } from '../../components/events/EventForm';
import { EventCard } from '../../components/events/EventCard';
import { isEventPast, localDayStartIso, useLocalDay } from '../../eventDate';

export default function Events() {
  const { user } = useAuth();
  const today = useLocalDay();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Club context and filter
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [myAssignedClubs, setMyAssignedClubs] = useState<any[]>([]);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const clubsRes = await api<any>('GET', '/clubs').then(res => res.data).catch(() => []);
      setAllClubs(clubsRes);

      let assigned: any[] = [];
      if (user?.role === 'faculty_coordinator') {
        assigned = clubsRes.filter((c: any) => {
          const coordId = typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId?._id : c.facultyCoordinatorId;
          return coordId === user._id;
        });
        setMyAssignedClubs(assigned);
      } else if (user?.role === 'club_admin') {
        assigned = clubsRes;
        setMyAssignedClubs(clubsRes);
      }

      let evts: any[] = [];
      // Faculty Coordinator and Club Admin must see events from ALL clubs
      if (user?.role === 'faculty_coordinator' || user?.role === 'club_admin') {
        evts = await api<any>('GET', '/events').then(res => res.data).catch(() => []);
      } else {
        // Students and other roles view upcoming events across all clubs
        evts = await api<any>('GET', `/events/upcoming?from=${encodeURIComponent(localDayStartIso())}`).then(res => res.data).catch(() => []);
      }
      setEvents(evts);
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user, today]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [loading]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api('DELETE', `/events/${id}`);
      setEvents(prev => prev.filter(e => e._id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete event');
    }
  };


  // Filter by selected club if set
  let filteredEvents = events;
  if (selectedClubFilter !== 'all') {
    filteredEvents = filteredEvents.filter(e => {
      const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return eClubId === selectedClubFilter;
    });
  }

  // Filter by selected calendar date if set
  let displayEvents = filteredEvents;
  if (selectedDate) {
    displayEvents = filteredEvents.filter(e => {
      const d = new Date(e.eventDate || e.date);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }

  const upcomingEvents = displayEvents
    .filter(e => !isEventPast(e.eventDate || e.date))
    .sort((a, b) => new Date(a.eventDate || a.date).getTime() - new Date(b.eventDate || b.date).getTime());

  const pastEvents = displayEvents
    .filter(e => isEventPast(e.eventDate || e.date))
    .sort((a, b) => new Date(b.eventDate || b.date).getTime() - new Date(a.eventDate || a.date).getTime());

  // Authorization check for event management
  const canManageEvent = (e: any) => {
    if (user?.role === 'club_admin') return true;
    if (user?.role === 'faculty_coordinator') {
      const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return myAssignedClubs.some(c => c._id === eClubId);
    }
    return false;
  };

  const canAddEvent =
    user?.role === 'club_admin' || (user?.role === 'faculty_coordinator' && myAssignedClubs.length > 0);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => {
    return filteredEvents.filter(e => {
      const d = new Date(e.eventDate || e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '6px' }}>
            Events
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Discover upcoming activities, workshops, and past meetups from all university clubs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {allClubs.length > 0 && (
            <select
              className="input"
              value={selectedClubFilter}
              onChange={e => setSelectedClubFilter(e.target.value)}
              style={{ minWidth: '180px', height: '40px' }}
            >
              <option value="all">All Clubs ({events.length} events)</option>
              {allClubs.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {canAddEvent && !showForm && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingEvent(null);
                setShowForm(true);
              }}
            >
              + Create Event
            </button>
          )}
        </div>
      </div>

      {/* Event Form (Create / Edit) */}
      {showForm && canAddEvent && (
        <div style={{ marginBottom: '32px' }}>
          <EventForm
            availableClubs={myAssignedClubs}
            clubId={editingEvent ? (typeof editingEvent.clubId === 'object' ? editingEvent.clubId?._id : editingEvent.clubId) : (myAssignedClubs.length === 1 ? myAssignedClubs[0]._id : undefined)}
            event={editingEvent}
            onSave={() => {
              setShowForm(false);
              setEditingEvent(null);
              loadEvents();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      )}

      {/* Calendar View */}
      <div className="card" style={{ marginBottom: '36px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
            &laquo; Prev
          </button>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#16a34a' }}></span>
                Upcoming Event
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#f97316' }}></span>
                Past Event
              </div>
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
            Next &raquo;
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '13px', paddingBottom: '8px', textAlign: 'center' }}>
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: '90px' }} />
          ))}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isSelected =
              selectedDate?.getFullYear() === year &&
              selectedDate?.getMonth() === month &&
              selectedDate?.getDate() === day;
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
                  background: isSelected ? 'var(--primary-glow)' : 'var(--bg)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  minHeight: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text)', marginBottom: '2px' }}>
                  {day}
                </div>
                {visibleEvents.map(e => {
                  const isPast = isEventPast(e.eventDate || e.date);
                  return (
                    <div
                      key={e._id}
                      onClick={evt => {
                        evt.stopPropagation();
                        const d = new Date(year, month, day);
                        setSelectedDate(d);
                      }}
                      style={{
                        fontSize: '11px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: isPast ? '#ffedd5' : '#16a34a',
                        color: isPast ? '#9a3412' : '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        border: isPast ? '1px solid #fdba74' : '1px solid #15803d',
                      }}
                      title={`${e.title} (${typeof e.clubId === 'object' ? e.clubId?.name : ''})`}
                    >
                      {e.title}
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <div
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, padding: '2px 4px', textAlign: 'center' }}
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
            <button className="btn btn-sm btn-outline" onClick={() => setSelectedDate(null)}>
              Clear Date Filter
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Events Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
          {selectedDate ? `Upcoming Events on ${selectedDate.toLocaleDateString()}` : 'Upcoming Events'}
          <span className="badge badge-success" style={{ marginLeft: '6px' }}>{upcomingEvents.length}</span>
        </h3>

        {upcomingEvents.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {upcomingEvents.map(e => (
              <EventCard
                key={e._id}
                event={e}
                canManage={canManageEvent(e)}
                onEdit={evt => {
                  setEditingEvent(evt);
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handleDelete}
                isPast={false}
              />
            ))}
          </div>
        ) : (
          <div
            className="empty-state"
            style={{
              padding: '36px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
              textAlign: 'center',
            }}
          >
            No upcoming events scheduled {selectedDate ? 'for this day' : ''}{selectedClubFilter !== 'all' ? ' for this club' : ''}.
          </div>
        )}
      </div>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }}></span>
            Past Events
            <span className="badge" style={{ marginLeft: '6px', background: '#ffedd5', color: '#9a3412' }}>
              {pastEvents.length}
            </span>
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {pastEvents.map(e => (
              <EventCard
                key={e._id}
                event={e}
                canManage={canManageEvent(e)}
                onEdit={evt => {
                  setEditingEvent(evt);
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handleDelete}
                isPast={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
