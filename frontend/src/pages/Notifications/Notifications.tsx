import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>('GET', '/notifications').then(res => {
      setNotifications(res.data);
      setLoading(false);
    });
  }, []);

  const markRead = async (id: string) => {
    try {
      await api('PATCH', `/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Notifications</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Stay updated with recent activities across your clubs and projects.</p>
        </div>
      </div>
      {loading ? <div className="spinner" style={{ margin: '40px auto', display: 'block' }}></div> : (
        notifications.length ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {notifications.map(n => (
              <div key={n._id} className="card" style={{ padding: '20px', background: n.isRead ? 'var(--bg-card-2)' : 'var(--surface)', border: n.isRead ? '1px solid var(--border)' : '1px solid var(--accent)', boxShadow: n.isRead ? 'none' : 'var(--shadow-sm)', opacity: n.isRead ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {!n.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>}
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text)' }}>{n.title}</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.message}</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-faint)' }}>
                      {new Date(n.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  {!n.isRead && <button className="btn btn-sm btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={() => markRead(n._id)}>Mark as Read</button>}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>You're all caught up! No notifications.</div>
      )}
    </div>
  );
}
