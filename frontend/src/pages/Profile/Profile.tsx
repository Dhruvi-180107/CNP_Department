import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { User } from '../../types';
import './profile.css';

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  faculty_coordinator: 'Faculty coordinator',
  faculty_mentor: 'Faculty mentor',
  club_admin: 'Club admin',
  project_admin: 'Project admin',
};

type ProfileUser = User & { createdAt?: string };

function roleLabel(role?: string) {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function formatMemberSince(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const profileUser = user as ProfileUser | null;

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
    enrollmentNumber: user?.enrollmentNumber || '',
    semester: user?.semester || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const focusEditRef = useRef(false);
  const focusReadRef = useRef(false);
  const focusFieldRef = useRef<'name' | 'bio'>('name');
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isEditing && focusEditRef.current) {
      focusEditRef.current = false;
      if (focusFieldRef.current === 'bio') bioInputRef.current?.focus();
      else nameInputRef.current?.focus();
    } else if (!isEditing && focusReadRef.current) {
      focusReadRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  if (!user) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api<any>('PATCH', '/users/profile', formData);
      updateUser(res.data);
      setSuccess('Profile updated');
      focusReadRef.current = true;
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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
    focusReadRef.current = true;
    setIsEditing(false);
    setFormData({
      name: user.name || '',
      department: user.department || '',
      universityId: user.universityId || '',
      enrollmentNumber: user.enrollmentNumber || '',
      semester: user.semester || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    setError('');
    setSuccess('');
  };

  const handleStartEdit = (field: 'name' | 'bio' = 'name') => {
    setError('');
    setSuccess('');
    focusFieldRef.current = field;
    focusEditRef.current = true;
    setIsEditing(true);
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard is unavailable outside a secure context; the mailto link remains. */
    }
  };

  // MOCK: no completeness field exists — the percentage is derived client-side
  // from the same required-field predicate as isProfileComplete().
  const completeness = [
    { label: 'Name', done: hasName },
    { label: 'Department', done: hasDept },
    { label: 'Phone number', done: hasPhone },
    ...(isStudent
      ? [
          { label: 'University ID', done: hasUniId },
          { label: 'Semester', done: hasSemester },
        ]
      : []),
  ];
  const doneCount = completeness.filter(field => field.done).length;
  const percent = Math.round((doneCount / completeness.length) * 100);
  const missing = completeness.filter(field => !field.done).map(field => field.label);
  // MOCK: createdAt is returned by Mongoose but is not part of the documented
  // User shape; the row is omitted when the field is absent.
  const memberSince = formatMemberSince(profileUser?.createdAt);

  const identityName = (isEditing ? formData.name.trim() : user.name) || user.name;
  const identityDepartment = (isEditing ? formData.department : user.department) || user.department;
  const identitySemester = (isEditing ? formData.semester : user.semester) || user.semester;
  const identityEnrollment = (isEditing ? formData.enrollmentNumber : user.enrollmentNumber) || user.enrollmentNumber;

  const metaItems = [
    identityDepartment,
    isStudent && identitySemester ? `Semester ${identitySemester}` : '',
    isStudent && identityEnrollment ? `Enrollment ${identityEnrollment}` : '',
  ].filter(Boolean) as string[];

  return (
    <div className="prf-page">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Your profile</h1>
          <p className="ui-sub">Identity, academic record and contact details on file for your account.</p>
        </div>
        <div className="ui-page-actions">
          {isEditing ? (
            <>
              {isProfileComplete && (
                <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
              )}
              <button
                type="submit"
                form="prf-profile-form"
                className="ui-btn ui-btn--primary"
                disabled={loading}
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button
              ref={editButtonRef}
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => handleStartEdit('name')}
            >
              <PencilIcon />
              Edit profile
            </button>
          )}
        </div>
      </header>

      {(error || success || !isProfileComplete) && (
        <div className="prf-notices">
          {!isProfileComplete && (
            <div className="ui-notice">
              <AlertIcon />
              <span>
                <strong>Profile incomplete.</strong>{' '}
                {missing.length === 1
                  ? missing[0]
                  : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`}{' '}
                {missing.length === 1 ? 'is' : 'are'} still needed. Complete{' '}
                {missing.length === 1 ? 'it' : 'them'} to finish setting up your account.
              </span>
            </div>
          )}
          {error && (
            <div className="ui-notice ui-notice--error" role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <p className="prf-notice" role="status">
              <CheckIcon />
              <span>{success}</span>
            </p>
          )}
        </div>
      )}

      <section className="prf-identity" aria-labelledby="prf-identity-name">
        <div className="prf-identity__avatar">
          {user.profileImage ? (
            <span className="ui-avatar prf-avatar">
              <img src={user.profileImage} alt="" />
            </span>
          ) : (
            <span className="ui-avatar prf-avatar" aria-hidden="true">
              {initialsOf(identityName)}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="ui-visually-hidden"
            tabIndex={-1}
          />
          <button
            type="button"
            className="prf-avatar__action"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label={user.profileImage ? 'Replace profile photo' : 'Upload profile photo'}
            title="Change profile photo"
          >
            <CameraIcon />
          </button>
        </div>

        <div className="prf-identity__body">
          <div className="prf-identity__line">
            <h2 className="prf-identity__name" id="prf-identity-name">{identityName}</h2>
            <span className="ui-tag ui-tag--plain">{roleLabel(user.role)}</span>
          </div>
          {metaItems.length > 0 && (
            <p className="prf-identity__meta">
              {metaItems.map((item, index) => (
                <span key={`${item}-${index}`}>
                  {index > 0 && <span className="prf-sep" aria-hidden="true">·</span>}
                  {item}
                </span>
              ))}
            </p>
          )}
        </div>

        <div
          className="prf-completion"
          title={missing.length ? `Missing: ${missing.join(', ')}` : 'All required fields are on file'}
        >
          <p className="prf-completion__value">{percent}%</p>
          <div
            className="ui-meter"
            role="progressbar"
            aria-label="Profile completeness"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="ui-meter__fill" style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
          <p className="prf-completion__label">
            {percent === 100
              ? 'All required details on file'
              : missing.length === 1
                ? `Missing ${missing[0].toLowerCase()}`
                : `Missing ${missing.length} details`}
          </p>
        </div>
      </section>

      {isEditing ? (
        <form className="prf-form" id="prf-profile-form" onSubmit={handleSave}>
          <section className="ui-panel">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Edit details</h2>
                <span className="ui-panel__meta">Changes save to your account</span>
              </div>
            </header>

            <div className="ui-panel__body">
              <div className="prf-edit-grid">
                <div className="prf-edit-col">
                  <section className="prf-edit-section">
                    <h3 className="ui-h3 prf-section__title">Identity</h3>
                    <div className="ui-form-row ui-form-row--2">
                      <div className="prf-field">
                        <label className="ui-label" htmlFor="prf-full-name">
                          Full name <span className="prf-req" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="prf-full-name"
                          ref={nameInputRef}
                          className="ui-field"
                          type="text"
                          autoComplete="name"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="prf-field">
                        <label className="ui-label" htmlFor="prf-email">Email address</label>
                        <input id="prf-email" className="ui-field" type="email" value={user.email} disabled />
                        <p className="ui-hint">Managed by your college account.</p>
                      </div>
                    </div>
                  </section>

                  <section className="prf-edit-section">
                    <h3 className="ui-h3 prf-section__title">Contact</h3>
                    <div className="prf-field">
                      <label className="ui-label" htmlFor="prf-phone">
                        Phone number <span className="prf-req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="prf-phone"
                        className="ui-field"
                        type="tel"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                  </section>
                </div>

                <div className="prf-edit-col">
                  <section className="prf-edit-section">
                    <h3 className="ui-h3 prf-section__title">
                      {isStudent ? 'Academic record' : 'Department'}
                    </h3>
                    {isStudent ? (
                      <>
                        <div className="ui-form-row ui-form-row--2">
                          <div className="prf-field">
                            <label className="ui-label" htmlFor="prf-department">
                              Department <span className="prf-req" aria-hidden="true">*</span>
                            </label>
                            <input
                              id="prf-department"
                              className="ui-field"
                              type="text"
                              value={formData.department}
                              onChange={e => setFormData({ ...formData, department: e.target.value })}
                              required
                              disabled={loading}
                            />
                          </div>
                          <div className="prf-field">
                            <label className="ui-label" htmlFor="prf-semester">
                              Semester <span className="prf-req" aria-hidden="true">*</span>
                            </label>
                            <input
                              id="prf-semester"
                              className="ui-field"
                              type="number"
                              min="1"
                              max="10"
                              value={formData.semester}
                              onChange={e => setFormData({ ...formData, semester: e.target.value })}
                              required
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <div className="ui-form-row ui-form-row--2">
                          <div className="prf-field">
                            <label className="ui-label" htmlFor="prf-university-id">
                              University ID <span className="prf-req" aria-hidden="true">*</span>
                            </label>
                            <input
                              id="prf-university-id"
                              className="ui-field"
                              type="text"
                              value={formData.universityId}
                              onChange={e => setFormData({ ...formData, universityId: e.target.value })}
                              required
                              disabled={loading}
                            />
                          </div>
                          <div className="prf-field">
                            <label className="ui-label" htmlFor="prf-enrollment">Enrollment number</label>
                            <input
                              id="prf-enrollment"
                              className="ui-field"
                              type="text"
                              value={formData.enrollmentNumber}
                              onChange={e => setFormData({ ...formData, enrollmentNumber: e.target.value })}
                              disabled={loading}
                              placeholder="e.g. 0901CS201045"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="prf-field">
                        <label className="ui-label" htmlFor="prf-department">
                          Department <span className="prf-req" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="prf-department"
                          className="ui-field"
                          type="text"
                          value={formData.department}
                          onChange={e => setFormData({ ...formData, department: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    )}
                  </section>

                  <section className="prf-edit-section">
                    <h3 className="ui-h3 prf-section__title">About</h3>
                    <div className="prf-field">
                      <label className="ui-label" htmlFor="prf-bio">Bio</label>
                      <textarea
                        id="prf-bio"
                        ref={bioInputRef}
                        className="ui-field ui-field--area"
                        rows={3}
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        disabled={loading}
                        placeholder="Tell us about yourself..."
                      />
                      <p className="ui-hint">A sentence or two about your work, interests or role.</p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <footer className="prf-form__foot">
            {isProfileComplete && (
              <button type="button" className="ui-btn ui-btn--ghost" onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
            )}
            <button type="submit" className="ui-btn ui-btn--primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </footer>
        </form>
      ) : (
        <div className="prf-grid">
          <section className="ui-panel">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Profile record</h2>
              </div>
            </header>
            <div className="ui-panel__body prf-record__body">
              <section className="prf-section">
                <h3 className="ui-h3 prf-section__title">About</h3>
                {user.bio ? (
                  <p className="prf-bio">{user.bio}</p>
                ) : (
                  <div className="prf-empty">
                    <p className="prf-empty__text">
                      No bio yet. A short note helps coordinators and teammates know what you work on.
                    </p>
                    <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={() => handleStartEdit('bio')}>
                      Add a bio
                    </button>
                  </div>
                )}
              </section>

              {(isStudent || user.department) && (
                <section className="prf-section">
                  <h3 className="ui-h3 prf-section__title">
                    {isStudent ? 'Academic record' : 'Department'}
                  </h3>
                  {isStudent ? (
                    <dl className="prf-facts">
                      {user.department && <Fact label="Department" value={user.department} />}
                      <Fact label="Semester" value={user.semester} />
                      <Fact label="University ID" value={user.universityId} />
                      <Fact label="Enrollment no." value={user.enrollmentNumber} />
                    </dl>
                  ) : (
                    <p className="prf-record__value">{user.department}</p>
                  )}
                </section>
              )}
            </div>
          </section>

          <div className="prf-col">
            <section className="ui-panel">
              <header className="ui-panel__head">
                <div className="ui-panel__titles">
                  <h2 className="ui-panel__title">Contact</h2>
                </div>
              </header>
              <div className="ui-panel__body">
                <dl className="prf-facts">
                  <div className="prf-fact">
                    <dt className="prf-fact__label">Email</dt>
                    <dd className="prf-fact__value">
                      <a className="ui-link prf-fact__link" href={`mailto:${user.email}`}>{user.email}</a>
                      <button
                        type="button"
                        className="ui-icon-btn prf-copy"
                        onClick={handleCopyEmail}
                        aria-label="Copy email address"
                        title="Copy email address"
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </dd>
                  </div>
                  <div className="prf-fact">
                    <dt className="prf-fact__label">Phone</dt>
                    <dd className="prf-fact__value">
                      {user.phone ? (
                        <a className="ui-link prf-fact__link" href={`tel:${user.phone}`}>{user.phone}</a>
                      ) : (
                        <span className="prf-muted">Not provided</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="ui-panel">
              <header className="ui-panel__head">
                <div className="ui-panel__titles">
                  <h2 className="ui-panel__title">Account</h2>
                </div>
              </header>
              <div className="ui-panel__body">
                <dl className="prf-facts">
                  <Fact label="Role" value={roleLabel(user.role)} />
                  {memberSince && <Fact label="Member since" value={memberSince} />}
                  <Fact label="Photo" value={user.profileImage ? 'Uploaded image' : 'Initials monogram'} />
                </dl>
              </div>
            </section>
          </div>
        </div>
      )}

      <span className="ui-visually-hidden" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  const shown = value === 0 ? '0' : value ? String(value) : '';
  return (
    <div className="prf-fact">
      <dt className="prf-fact__label">{label}</dt>
      <dd className="prf-fact__value">
        {shown || <span className="prf-muted">Not provided</span>}
      </dd>
    </div>
  );
}

/* ── Icons · 24px grid, 1.7 stroke, currentColor ─────────────────────────── */

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.1L19 9.1a2.1 2.1 0 0 0-3-3L5.1 17 4 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m14.5 7.5 2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="6.8" width="17.6" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.6 6.8 10 4.2h4l1.4 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="13.2" r="3.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.6v5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="1" fill="currentColor" />
    </svg>
  );
}
