import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api';

export interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  semester?: number;
  profileImage?: string;
  universityId?: string;
  enrollmentNumber?: string;
  phone?: string;
}

export interface UserSelectProps {
  role: 'student' | 'faculty_coordinator' | 'faculty_mentor';
  value: string;
  onChange: (userId: string, user?: UserOption | null) => void;
  disabledUserIds?: string[];
  disabledReason?: string | ((user: UserOption) => string);
  placeholder?: string;
  emptyMessage?: string;
  label?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

export function UserSelect({
  role,
  value,
  onChange,
  disabledUserIds = [],
  disabledReason = 'Already assigned',
  placeholder,
  emptyMessage,
  label,
  id,
  required,
  disabled = false,
}: UserSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Default placeholders & empty messages by role
  const defaultPlaceholder = useMemo(() => {
    switch (role) {
      case 'student':
        return 'Search student by name, email, or department...';
      case 'faculty_mentor':
        return 'Search faculty mentor by name, email, or department...';
      case 'faculty_coordinator':
        return 'Search faculty coordinator by name or email...';
      default:
        return 'Search users...';
    }
  }, [role]);

  const defaultEmptyMessage = useMemo(() => {
    switch (role) {
      case 'student':
        return 'No registered students found';
      case 'faculty_mentor':
        return 'No eligible mentors available';
      case 'faculty_coordinator':
        return 'No registered coordinators found';
      default:
        return 'No users found';
    }
  }, [role]);

  // Fetch users from MongoDB Atlas via GET /api/users?role=${role}
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ success: boolean; data: UserOption[] }>('GET', `/users?role=${role}`);
      setUsers(res.data || []);
    } catch (err: any) {
      console.error(`Failed to load ${role} users:`, err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [role]);

  // Selected user object
  const selectedUser = useMemo(() => {
    return users.find((u) => u._id === value) || null;
  }, [users, value]);

  // Filter users by search term (name, email, department)
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(term);
      const emailMatch = u.email.toLowerCase().includes(term);
      const deptMatch = u.department ? u.department.toLowerCase().includes(term) : false;
      const enrMatch = u.enrollmentNumber ? u.enrollmentNumber.toLowerCase().includes(term) : false;
      return nameMatch || emailMatch || deptMatch || enrMatch;
    });
  }, [users, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (user: UserOption) => {
    const isDisabled = disabledUserIds.includes(user._id);
    if (isDisabled) return;
    onChange(user._id, user);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredUsers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredUsers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredUsers.length) {
        handleSelect(filteredUsers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const getDisabledText = (user: UserOption) => {
    if (typeof disabledReason === 'function') {
      return disabledReason(user);
    }
    return disabledReason;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-muted)',
          }}
        >
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {/* Main Trigger Box */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '44px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          background: 'var(--bg)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 2px rgba(var(--primary-rgb), 0.15)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {selectedUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {/* Avatar */}
            {selectedUser.profileImage ? (
              <img
                src={selectedUser.profileImage}
                alt={selectedUser.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Meta */}
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                  {selectedUser.name}
                </span>
                <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
                  ({selectedUser.email})
                </span>
              </div>
              {(selectedUser.department || selectedUser.semester || selectedUser.enrollmentNumber) && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedUser.enrollmentNumber && <span>Enrollment: {selectedUser.enrollmentNumber}</span>}
                  {selectedUser.enrollmentNumber && (selectedUser.department || selectedUser.semester) && <span> &middot; </span>}
                  {selectedUser.department && <span>{selectedUser.department}</span>}
                  {selectedUser.department && selectedUser.semester && <span> &middot; </span>}
                  {selectedUser.semester && <span>Semester {selectedUser.semester}</span>}
                </div>
              )}
            </div>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '14px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <span style={{ color: 'var(--text-faint)', fontSize: '13px' }}>
            {placeholder || defaultPlaceholder}
          </span>
        )}

        <span
          style={{
            color: 'var(--text-faint)',
            fontSize: '10px',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            marginLeft: '8px',
          }}
        >
          ▼
        </span>
      </div>

      {/* Dropdown Popover */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card-2)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="input"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to filter by name, email, department..."
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
              autoFocus
            />
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 8px' }}></div>
                Loading registered users...
              </div>
            ) : error ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--danger)', fontSize: '12px' }}>
                <p style={{ margin: '0 0 8px 0' }}>{error}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={loadUsers}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  Retry
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div
                style={{
                  padding: '20px 14px',
                  textAlign: 'center',
                  color: 'var(--text-faint)',
                  fontSize: '13px',
                }}
              >
                {searchTerm.trim()
                  ? `No registered ${role.replace('_', ' ')}s matching "${searchTerm}"`
                  : emptyMessage || defaultEmptyMessage}
              </div>
            ) : (
              filteredUsers.map((user, idx) => {
                const isAssigned = disabledUserIds.includes(user._id);
                const isSelected = user._id === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={user._id}
                    onClick={() => handleSelect(user)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: isAssigned ? 'not-allowed' : 'pointer',
                      background: isSelected
                        ? 'rgba(var(--primary-rgb), 0.12)'
                        : isHighlighted && !isAssigned
                        ? 'var(--surface)'
                        : 'transparent',
                      opacity: isAssigned ? 0.6 : 1,
                      border: isSelected ? '1px solid var(--primary-soft)' : '1px solid transparent',
                      transition: 'background 0.1s ease',
                      marginBottom: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      {/* Avatar */}
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isAssigned ? 'var(--border)' : 'var(--accent-glow)',
                            color: isAssigned ? 'var(--text-muted)' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: isAssigned ? 'var(--text-muted)' : 'var(--text)',
                            }}
                          >
                            {user.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                            {user.email}
                          </span>
                        </div>
                        {(user.department || user.semester || user.enrollmentNumber) && (
                          <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                            {user.enrollmentNumber && <span>Enrollment: {user.enrollmentNumber}</span>}
                            {user.enrollmentNumber && (user.department || user.semester) && <span> &middot; </span>}
                            {user.department && <span>{user.department}</span>}
                            {user.department && user.semester && <span> &middot; </span>}
                            {user.semester && <span>Semester {user.semester}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isAssigned ? (
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          background: 'var(--border)',
                          color: 'var(--text-muted)',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          marginLeft: '8px',
                        }}
                      >
                        {getDisabledText(user)}
                      </span>
                    ) : isSelected ? (
                      <span
                        style={{
                          color: 'var(--primary)',
                          fontWeight: 700,
                          fontSize: '13px',
                          marginLeft: '8px',
                        }}
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSelect;
