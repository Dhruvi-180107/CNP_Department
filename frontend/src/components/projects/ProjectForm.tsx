import { useState } from 'react';
import { api } from '../../services/api';

export function ProjectForm({ onSave, onCancel }: { onSave: () => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('POST', '/projects', formData);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '32px' }}>
      <div className="card-header">
        <h3 className="card-title" style={{ margin: 0 }}>Create New Project</h3>
      </div>
      <div className="card-body">
        {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Project Name</label>
              <input 
                type="text" 
                className="input" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
                placeholder="e.g. AI Research Drone"
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Initial Status</label>
              <select 
                className="input" 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
            <textarea 
              className="input" 
              rows={4} 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
              required 
              placeholder="Describe the project goals and objectives..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
