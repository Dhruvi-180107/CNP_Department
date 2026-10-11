import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  
  const isStudent = user?.role === 'student';
  const hasDept = !!(user?.department && user.department.trim());
  const hasPhone = !!(user?.phone && user.phone.trim());
  const hasUniId = !!(user?.universityId && user.universityId.trim());
  const hasSemester = !!user?.semester;
  const hasName = !!(user?.name && user.name.trim());
  const isProfileComplete = hasName && hasDept && hasPhone && (isStudent ? (hasUniId && hasSemester) : true);

  const [isEditing, setIsEditing] = useState(!isProfileComplete);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    universityId: user?.universityId || '',
    semester: user?.semester || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api<any>('PATCH', '/users/profile', formData);
      updateUser(res.data);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const fd = new FormData();
    fd.append('image', file);
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await api<any>('POST', '/users/profile-image', fd);
      updateUser({ ...user, profileImage: res.data.profileImage });
      setSuccess('Profile image updated');
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user.name || '',
      department: user.department || '',
      universityId: user.universityId || '',
      semester: user.semester || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Your Profile</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage your academic information and identity.</p>
        </div>
        {!isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
        )}
      </div>
      
      {!isProfileComplete && (
        <div style={{ padding: '16px', background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(var(--warn-rgb), 0.2)' }}>
          <strong>Action Required:</strong> Please complete your profile to access all features of the application.
        </div>
      )}
      
      {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '12px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(var(--success-rgb), 0.2)' }}>{success}</div>}

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold' }}>
                {user.name.charAt(0)}
              </div>
            )}
            {isEditing && (
              <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-sm btn-primary" style={{ padding: '4px 8px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={loading}>
                  📷
                </button>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <div className="auth-field" style={{ margin: 0 }}>
                <label>Full Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required disabled={loading} style={{ fontSize: '18px', padding: '8px' }} />
              </div>
            ) : (
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text)' }}>{user.name}</h2>
            )}
            <span className="badge badge-student" style={{ fontSize: '13px', padding: '6px 12px', marginTop: '8px', display: 'inline-block' }}>{user.role.replace('_', ' ')}</span>
          </div>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Email Address <span style={{ color: 'var(--text-faint)', fontWeight: 'normal' }}>(Read Only)</span></label>
              <input type="email" value={user.email} disabled className="input" style={{ opacity: 0.7 }} />
            </div>
            {isStudent && (
              <>
                <div className="auth-field" style={{ margin: 0 }}>
                  <label>University ID <span style={{ color: 'var(--warn)' }}>*</span></label>
                  <input type="text" value={formData.universityId} onChange={e => setFormData({ ...formData, universityId: e.target.value })} required disabled={loading} />
                </div>
                <div className="auth-field" style={{ margin: 0 }}>
                  <label>Semester <span style={{ color: 'var(--warn)' }}>*</span></label>
                  <input type="number" min="1" max="10" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} required disabled={loading} />
                </div>
              </>
            )}
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Department <span style={{ color: 'var(--warn)' }}>*</span></label>
              <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required disabled={loading} />
            </div>
            <div className="auth-field" style={{ margin: 0 }}>
              <label>Phone Number <span style={{ color: 'var(--warn)' }}>*</span></label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required disabled={loading} />
            </div>
            <div className="auth-field" style={{ gridColumn: '1 / -1', margin: 0 }}>
              <label>Bio</label>
              <textarea rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} disabled={loading} placeholder="Tell us about yourself..." />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              {isProfileComplete && (
                <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={loading}>Cancel</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email Address</strong>
              <div style={{ fontSize: '15px', color: 'var(--text)' }}>{user.email}</div>
            </div>
            {isStudent && user.universityId && (
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>University ID</strong>
                <div style={{ fontSize: '15px', color: 'var(--text)' }}>{user.universityId}</div>
              </div>
            )}
            {isStudent && user.semester && (
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Semester</strong>
                <div style={{ fontSize: '15px', color: 'var(--text)' }}>{user.semester}</div>
              </div>
            )}
            {user.department && (
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Department</strong>
                <div style={{ fontSize: '15px', color: 'var(--text)' }}>{user.department}</div>
              </div>
            )}
            {user.phone && (
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Phone Number</strong>
                <div style={{ fontSize: '15px', color: 'var(--text)' }}>{user.phone}</div>
              </div>
            )}
            {user.bio && (
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Bio</strong>
                <div style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.6, background: 'var(--bg-card-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>{user.bio}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
