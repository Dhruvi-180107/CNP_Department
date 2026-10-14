import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface ProjectMaterialItem {
  _id: string;
  projectId: string;
  name: string;
  quantity: number;
  source: 'self_purchased' | 'owned' | 'guitar';
  inventoryItemId?: {
    _id: string;
    name: string;
    category?: string;
  };
  materialRequestId?: {
    _id: string;
    specifications?: string;
    reason?: string;
    documentUrl?: string;
    documentOriginalName?: string;
    imageUrl?: string;
  };
  addedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  image?: string;
  imagePublicId?: string;
  specifications?: string;
  documentUrl?: string;
  documentOriginalName?: string;
  createdAt: string;
}

interface ProjectMaterialsProps {
  projectId: string;
  isTL?: boolean;
}

export function ProjectMaterials({ projectId, isTL = false }: ProjectMaterialsProps) {
  const [materials, setMaterials] = useState<ProjectMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'guitar' | 'self_purchased' | 'owned'>('all');

  // Modal State for Team Leader Add Material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [source, setSource] = useState<'self_purchased' | 'owned'>('self_purchased');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [specifications, setSpecifications] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchMaterials = () => {
    api<any>('GET', `/projects/${projectId}/materials`)
      .then(res => setMaterials(res.data || []))
      .catch(err => {
        if (err.status !== 403) setError(err.message || 'Failed to load project materials');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMaterials();
  }, [projectId]);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isModalOpen]);

  const openModal = () => {
    setIsModalOpen(true);
    setName('');
    setSource('self_purchased');
    setQuantity(1);
    setSpecifications('');
    setDocumentFile(null);
    setImageFile(null);
    setImagePreview(null);
    setSubmitError('');
    setSubmitSuccess('');
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setDocumentFile(file || null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!name.trim()) {
      setSubmitError('Material name is required');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      setSubmitError('Quantity must be at least 1');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('quantity', String(qty));
      formData.append('source', source);
      if (specifications.trim()) {
        formData.append('specifications', specifications.trim());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (documentFile) {
        formData.append('document', documentFile);
      }

      await api('POST', `/projects/${projectId}/materials`, formData);
      setSubmitSuccess('Project material added successfully!');
      fetchMaterials();

      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to add project material');
    } finally {
      setSubmitting(false);
    }
  };

  const guitarCount = materials.filter(m => m.source === 'guitar').length;
  const selfPurchasedCount = materials.filter(m => m.source === 'self_purchased').length;
  const ownedCount = materials.filter(m => m.source === 'owned').length;

  const filteredMaterials = materials.filter(m => {
    if (activeFilter === 'all') return true;
    return m.source === activeFilter;
  });

  if (loading) return <div className="spinner"></div>;
  if (error) {
    return (
      <div style={{ color: 'var(--danger)', padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Project Materials</h3>
            <span
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {materials.length} {materials.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Inventory of components allocated, self-purchased, or owned by the project team.
          </p>
        </div>

        {isTL && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={openModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderColor: 'var(--border)',
            }}
          >
            <span>+</span> Add Material
          </button>
        )}
      </div>

      {/* Source Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: activeFilter === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: activeFilter === 'all' ? 'var(--primary)' : '#ffffff',
            color: activeFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All ({materials.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('guitar')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: activeFilter === 'guitar' ? '1px solid #4f46e5' : '1px solid var(--border)',
            background: activeFilter === 'guitar' ? '#4f46e5' : '#ffffff',
            color: activeFilter === 'guitar' ? '#ffffff' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🎸 Guitar Inventory ({guitarCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('self_purchased')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: activeFilter === 'self_purchased' ? '1px solid #059669' : '1px solid var(--border)',
            background: activeFilter === 'self_purchased' ? '#059669' : '#ffffff',
            color: activeFilter === 'self_purchased' ? '#ffffff' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🛍️ Self-Purchased ({selfPurchasedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('owned')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: activeFilter === 'owned' ? '1px solid #d97706' : '1px solid var(--border)',
            background: activeFilter === 'owned' ? '#d97706' : '#ffffff',
            color: activeFilter === 'owned' ? '#ffffff' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          📦 Owned ({ownedCount})
        </button>
      </div>

      {/* Material Cards Grid */}
      <div className="card-body" style={{ padding: 0 }}>
        {filteredMaterials.length ? (
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filteredMaterials.map(mat => {
              // Image resolution (from mat or linked request)
              const displayImage = mat.image || mat.materialRequestId?.imageUrl;
              // Specifications resolution
              const displaySpecs = mat.specifications || mat.materialRequestId?.specifications;
              // Document resolution
              const displayDocUrl = mat.documentUrl || mat.materialRequestId?.documentUrl;
              const displayDocName = mat.documentOriginalName || mat.materialRequestId?.documentOriginalName || 'Document';

              // Source Badge Configuration
              const sourceBadge = (() => {
                if (mat.source === 'guitar') {
                  return {
                    label: 'Guitar Inventory',
                    icon: '🎸',
                    bg: 'rgba(99, 102, 241, 0.12)',
                    color: '#4f46e5',
                    border: 'rgba(99, 102, 241, 0.25)',
                  };
                }
                if (mat.source === 'self_purchased') {
                  return {
                    label: 'Self-Purchased',
                    icon: '🛍️',
                    bg: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    border: 'rgba(16, 185, 129, 0.25)',
                  };
                }
                return {
                  label: 'Owned',
                  icon: '📦',
                  bg: 'rgba(245, 158, 11, 0.12)',
                  color: '#d97706',
                  border: 'rgba(245, 158, 11, 0.25)',
                };
              })();

              return (
                <div
                  key={mat._id}
                  style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    background: 'var(--bg-card-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* Top: Name, Image, Quantity */}
                  <div>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      {/* Image Thumbnail or Source Icon */}
                      {displayImage ? (
                        <a
                          href={displayImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click to view full photo"
                          style={{ display: 'block', flexShrink: 0 }}
                        >
                          <img
                            src={displayImage}
                            alt={mat.name}
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              border: '1px solid var(--border)',
                              background: '#ffffff',
                            }}
                          />
                        </a>
                      ) : (
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '10px',
                            background: sourceBadge.bg,
                            border: `1px solid ${sourceBadge.border}`,
                            color: sourceBadge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0,
                          }}
                        >
                          {sourceBadge.icon}
                        </div>
                      )}

                      {/* Name & Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <h4
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '16px',
                              fontWeight: 600,
                              color: 'var(--text)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {mat.name}
                          </h4>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--text)',
                              fontSize: '13px',
                              background: '#ffffff',
                              border: '1px solid var(--border)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              flexShrink: 0,
                            }}
                          >
                            x{mat.quantity}
                          </span>
                        </div>

                        {/* Source Badge */}
                        <div style={{ marginTop: '4px' }}>
                          <span
                            className="badge"
                            style={{
                              background: sourceBadge.bg,
                              color: sourceBadge.color,
                              border: `1px solid ${sourceBadge.border}`,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{sourceBadge.icon}</span>
                            <span>{sourceBadge.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Specifications or Description */}
                    {displaySpecs && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.45,
                        }}
                      >
                        <strong style={{ color: 'var(--text)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                          Specifications:
                        </strong>
                        <span style={{ color: 'var(--text)' }}>{displaySpecs}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Attachments, Date, Added By */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {displayDocUrl && (
                      <div>
                        <a
                          href={displayDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <span>📄</span>
                          <span>Reference Document ({displayDocName})</span>
                        </a>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-faint)', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Added on {new Date(mat.createdAt).toLocaleDateString()}</span>
                      {mat.addedBy?.name && (
                        <span>by {mat.addedBy.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '36px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontWeight: 500, color: 'var(--text)' }}>
              No {activeFilter !== 'all' ? activeFilter.replace('_', ' ') : ''} materials found
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {isTL
                ? 'Use "+ Add Material" above to add self-purchased or owned items, or request items from Guitar inventory.'
                : 'Project materials added or allocated to this project will appear here.'}
            </div>
          </div>
        )}
      </div>

      {/* Add Material Modal for Team Leader */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-material-title"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stable Header */}
            <div className="modal-header">
              <div>
                <h3 id="add-material-title" style={{ margin: 0, fontSize: '18px', color: 'var(--text)', fontWeight: 600 }}>
                  Add Project Material
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Record materials self-purchased or already owned by the team.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  lineHeight: 1,
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {submitError && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'var(--danger-soft)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: '13px',
                      }}
                    >
                      {submitError}
                    </div>
                  )}

                  {submitSuccess && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'var(--success-soft)',
                        color: 'var(--success)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        fontSize: '13px',
                      }}
                    >
                      {submitSuccess}
                    </div>
                  )}

                  {/* 1. Source Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Material Source <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: source === 'self_purchased' ? '2px solid #059669' : '1px solid var(--border)',
                          background: source === 'self_purchased' ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="source"
                          value="self_purchased"
                          checked={source === 'self_purchased'}
                          onChange={() => setSource('self_purchased')}
                          style={{ accentColor: '#059669' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>🛍️ Self-Purchased</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bought by project team</div>
                        </div>
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: source === 'owned' ? '2px solid #d97706' : '1px solid var(--border)',
                          background: source === 'owned' ? 'rgba(245, 158, 11, 0.08)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="source"
                          value="owned"
                          checked={source === 'owned'}
                          onChange={() => setSource('owned')}
                          style={{ accentColor: '#d97706' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>📦 Owned</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Already in team possession</div>
                        </div>
                      </label>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '6px' }}>
                      💡 Note: Materials from central Guitar Inventory must be requested via the Material Requests section below.
                    </div>
                  </div>

                  {/* 2. Material Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Material Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., PVC Pipe 20mm, Acrylic Sheet, Soldering Kit"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 3. Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Quantity <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 4. Specifications or Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Specifications or Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., 2-meter length, schedule 40 thickness, purchased from local hardware store"
                      value={specifications}
                      onChange={(e) => setSpecifications(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        lineHeight: 1.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 5. Reference Photo Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                      Material Photo (Optional)
                    </label>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Upload a photo of the item or receipt (JPG, PNG, WEBP up to 5MB).
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      style={{ fontSize: '13px', color: 'var(--text)', width: '100%' }}
                    />
                    {imagePreview && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={imagePreview}
                          alt="Material Preview"
                          style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          Remove Photo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6. Reference Document Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                      Reference Document (Optional)
                    </label>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Invoice, receipt, or technical manual (PDF, DOC, DOCX up to 10MB).
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleDocumentChange}
                      style={{ fontSize: '13px', color: 'var(--text)', width: '100%' }}
                    />
                    {documentFile && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          color: 'var(--text)',
                        }}
                      >
                        <span>📄 {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          onClick={() => setDocumentFile(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stable Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                  disabled={submitting}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !name.trim() || Number(quantity) < 1}
                  style={{ minWidth: '150px' }}
                >
                  {submitting ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
