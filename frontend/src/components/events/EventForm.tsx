import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

export function EventForm({ clubId, event, onSave, onCancel }: { clubId: string, event?: any, onSave: () => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    eventLink: '',
    eventLinkName: '',
    relatedDocumentName: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      const eventTime = event.eventDate || event.date;
      let dateVal = '';
      let timeVal = '';
      if (eventTime) {
        const d = new Date(eventTime);
        // format YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateVal = `${year}-${month}-${day}`;
        // format HH:MM
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        timeVal = `${hours}:${minutes}`;
      }
      setFormData({
        title: event.title,
        description: event.description,
        date: dateVal,
        time: timeVal,
        location: event.location,
        eventLink: event.eventLink || '',
        eventLinkName: event.eventLinkName || '',
        relatedDocumentName: event.relatedDocumentName || ''
      });
      setRemoveDocument(false);
      setFile(null);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('location', formData.location);
      fd.append('clubId', clubId);
      fd.append('eventDate', new Date(`${formData.date}T${formData.time}`).toISOString());
      if (formData.eventLink) {
        if (!formData.eventLink.startsWith('http://') && !formData.eventLink.startsWith('https://')) {
          setError('Event link must start with http:// or https://');
          setLoading(false);
          return;
        }
        fd.append('eventLink', formData.eventLink);
      }
      if (formData.eventLinkName) fd.append('eventLinkName', formData.eventLinkName);
      if (formData.relatedDocumentName) fd.append('relatedDocumentName', formData.relatedDocumentName);
      
      if (file) {
        fd.append('relatedDocument', file);
      } else if (removeDocument) {
        fd.append('removeDocument', 'true');
      }

      if (event) {
        await api('PUT', `/events/${event._id}`, fd);
      } else {
        await api('POST', '/events', fd);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--primary)' }}>
      <div className="card-header">
        <h3 style={{ margin: 0 }}>{event ? 'Edit Event' : 'Add New Event'}</h3>
      </div>
      <div className="card-body">
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div className="auth-field" style={{ margin: 0 }}>
            <label>Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Time</label>
              <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required />
            </div>
          </div>
          
          <div className="auth-field" style={{ margin: 0 }}>
            <label>Location</label>
            <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Link Display Name (Optional)</label>
              <input type="text" placeholder="e.g. Registration Link" value={formData.eventLinkName} onChange={e => setFormData({ ...formData, eventLinkName: e.target.value })} />
            </div>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Event Link URL (Optional)</label>
              <input type="url" placeholder="https://..." value={formData.eventLink} onChange={e => setFormData({ ...formData, eventLink: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Document Display Name (Optional)</label>
              <input type="text" placeholder="e.g. Event Guidelines" value={formData.relatedDocumentName} onChange={e => setFormData({ ...formData, relatedDocumentName: e.target.value })} />
            </div>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Related Document (Optional, PDF/DOC)</label>
              {event?.relatedDocument?.url && !removeDocument && !file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {event.relatedDocument.originalName}</span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setRemoveDocument(true)}>Remove</button>
                </div>
              )}
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                ref={fileInputRef}
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                    setRemoveDocument(false);
                  } else {
                    setFile(null);
                  }
                }} 
              />
            </div>
          </div>

          <div className="auth-field" style={{ margin: 0 }}>
            <label>Description</label>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
