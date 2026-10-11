import { useState } from 'react';
import { api } from '../../services/api';

export function ClubForm({ onSave, onCancel }: { onSave: () => void, onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      await api('POST', '/clubs', { name, description });
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to create club');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '32px', border: '1px solid var(--primary-soft)' }}>
      <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <h3 className="card-title">Create New Club</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-faint)' }}>Set up a new student organization.</p>
      </div>
      <form className="card-body" onSubmit={handleSubmit} style={{ padding: '0 24px 24px 24px' }}>
        {error && <div style={{ color: 'var(--danger)', background: 'var(--danger-soft)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '14px' }}>Club Name</label>
          <input 
            type="text" 
            className="input"
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Robotics Club"
            required 
            style={{ width: '100%', padding: '12px' }}
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '14px' }}>Description</label>
          <textarea 
            className="input"
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="What is this club about?"
            required 
            rows={4}
            style={{ width: '100%', padding: '12px', resize: 'vertical' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Club'}
          </button>
        </div>
      </form>
    </div>
  );
}
