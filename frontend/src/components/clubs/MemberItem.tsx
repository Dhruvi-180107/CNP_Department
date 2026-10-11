import { useState } from 'react';
import { api } from '../../services/api';
import { UserDisplay } from '../UserDisplay';

export function MemberItem({ m, clubId, canManage, onRefresh }: { m: any, clubId: string, canManage: boolean, onRefresh: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [membershipType, setMembershipType] = useState(m.membershipType);
  const [position, setPosition] = useState(m.position || '');
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Are you sure you want to remove ${m.studentId.name} from the club?`)) return;
    try {
      setLoading(true);
      await api('DELETE', `/clubs/${clubId}/members/${m.studentId._id}`);
      onRefresh();
      alert('Member removed successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to remove member');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload: any = { membershipType };
      if (membershipType === 'core_team') {
        payload.position = position;
      } else {
        payload.position = null;
      }
      await api('PATCH', `/clubs/${clubId}/members/${m.studentId._id}`, payload);
      onRefresh();
      setIsEditing(false);
      alert('Membership updated successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to update membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        {m.studentId.profileImage ? (
          <img src={m.studentId.profileImage} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {m.studentId.name.charAt(0)}
          </div>
        )}
        
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <UserDisplay user={m.studentId} showEmail={false} />
            <select className="input" value={membershipType} onChange={e => setMembershipType(e.target.value)} disabled={loading} style={{ padding: '6px', fontSize: '13px' }}>
              <option value="member">Member</option>
              <option value="core_team">Core Team</option>
            </select>
            {membershipType === 'core_team' && (
              <input 
                type="text" 
                className="input"
                placeholder="Position (e.g. President)" 
                value={position} 
                onChange={e => setPosition(e.target.value)} 
                disabled={loading} 
                style={{ padding: '6px', fontSize: '13px' }}
              />
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>Save</button>
              <button className="btn btn-sm btn-outline" onClick={() => {
                setIsEditing(false);
                setMembershipType(m.membershipType);
                setPosition(m.position || '');
              }} disabled={loading} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <UserDisplay user={m.studentId} showEmail={false} />
            <div style={{ marginTop: '4px' }}>
              {m.membershipType === 'core_team' ? (
                <span className="badge" style={{ background: 'var(--warn-glow)', color: 'var(--warn)', border: '1px solid rgba(var(--warn-rgb), 0.2)', fontSize: '11px', whiteSpace: 'normal', display: 'inline-block', lineHeight: 1.2 }}>
                  Core Team • {m.position || '-'}
                </span>
              ) : (
                <span className="badge badge-student" style={{ background: 'var(--bg)', color: 'var(--text-faint)', border: '1px solid var(--border)', fontSize: '11px' }}>Member</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {canManage && !isEditing && (
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-sm btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>Edit</button>
          <button className="btn btn-sm btn-outline" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }} onClick={handleRemove}>Remove</button>
        </div>
      )}
    </div>
  );
}
