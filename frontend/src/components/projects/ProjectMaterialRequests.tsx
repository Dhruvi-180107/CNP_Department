import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface InventoryItem {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  availableQuantity: number;
  totalQuantity: number;
  location?: string;
}

interface MaterialRequestItem {
  _id: string;
  projectId: string;
  materialName?: string;
  inventoryItemId?: InventoryItem;
  quantity: number;
  specifications?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  documentUrl?: string;
  documentOriginalName?: string;
  imageUrl?: string;
}

interface ProjectMaterialRequestsProps {
  projectId: string;
  isTL?: boolean;
}

export function ProjectMaterialRequests({ projectId, isTL = false }: ProjectMaterialRequestsProps) {
  const [requests, setRequests] = useState<MaterialRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchRequests = () => {
    api<any>('GET', `/material-requests/project/${projectId}`)
      .then(res => setRequests(res.data || []))
      .catch(err => {
        if (err.status !== 403) setError(err.message || 'Failed to load requests');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [projectId]);

  // Disable background page scrolling when the modal is open
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  const openModal = async () => {
    setIsModalOpen(true);
    setSubmitError('');
    setSubmitSuccess('');
    setLoadingInventory(true);
    try {
      const res = await api<any>('GET', '/inventory');
      setInventoryItems(res.data || []);
      if (res.data && res.data.length > 0 && !selectedItemId) {
        const firstAvailable = res.data.find((i: InventoryItem) => i.availableQuantity > 0) || res.data[0];
        setSelectedItemId(firstAvailable._id);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to load inventory items');
    } finally {
      setLoadingInventory(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setSelectedItemId('');
    setSpecifications('');
    setQuantity(1);
    setReason('');
    setDocumentFile(null);
    setImageFile(null);
    setImagePreview(null);
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

  const selectedItem = inventoryItems.find(i => i._id === selectedItemId);
  const maxAvailable = selectedItem ? selectedItem.availableQuantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedItemId) {
      setSubmitError('Please select a material from inventory');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      setSubmitError('Requested quantity must be at least 1');
      return;
    }

    if (qty > maxAvailable) {
      setSubmitError(`Requested quantity (${qty}) exceeds available stock (${maxAvailable})`);
      return;
    }

    if (!reason.trim()) {
      setSubmitError('Please provide a reason or explanation for this request');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('inventoryItemId', selectedItemId);
      formData.append('quantity', String(qty));
      formData.append('reason', reason.trim());
      if (specifications.trim()) {
        formData.append('specifications', specifications.trim());
      }
      if (documentFile) {
        formData.append('document', documentFile);
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api('POST', '/material-requests', formData);
      setSubmitSuccess('Material request submitted successfully! Awaiting Project Admin review.');
      fetchRequests();

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit material request');
    } finally {
      setSubmitting(false);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Material Requests</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Track components and materials requested from the central Guitar inventory.
          </p>
        </div>

        {isTL && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 600 }}
          >
            <span style={{ fontSize: '16px' }}>+</span> Request Materials
          </button>
        )}
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {requests.length ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {requests.map(req => {
              const statusColors: Record<string, { bg: string; color: string; label: string; icon: string }> = {
                'pending': { bg: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', label: 'Pending Review', icon: '⏳' },
                'approved': { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', label: 'Approved', icon: '✓' },
                'rejected': { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', label: 'Rejected', icon: '✕' },
              };
              const statusStyle = statusColors[req.status] || statusColors['pending'];
              const materialDisplayName = req.materialName || req.inventoryItemId?.name || 'Guitar Component';

              return (
                <div
                  key={req._id}
                  style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    background: 'var(--bg-card-2)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text)', fontWeight: 600 }}>
                          {materialDisplayName}
                        </h4>
                        <span
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          Qty: {req.quantity}
                        </span>
                        {req.inventoryItemId?.category && (
                          <span className="badge" style={{ fontSize: '11px', background: '#ffffff', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {req.inventoryItemId.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>
                        Requested on {new Date(req.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '20px',
                      }}
                    >
                      <span>{statusStyle.icon}</span> {statusStyle.label}
                    </span>
                  </div>

                  {req.specifications && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Specifications & Details:
                      </strong>
                      <span style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>{req.specifications}</span>
                    </div>
                  )}

                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)', fontSize: '13px' }}>Reason: </strong>
                    {req.reason}
                  </div>

                  {/* Attachments Section */}
                  {(req.imageUrl || req.documentUrl) && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '4px' }}>
                      {req.imageUrl && (
                        <a
                          href={req.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <img
                            src={req.imageUrl}
                            alt="Reference"
                            style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <span>View Reference Photo</span>
                        </a>
                      )}

                      {req.documentUrl && (
                        <a
                          href={req.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>📄</span>
                          <span>Reference Document {req.documentOriginalName ? `(${req.documentOriginalName})` : ''}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rejection notice */}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: 'var(--danger)',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: '13px',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                        Rejection Reason:
                      </strong>
                      {req.rejectionReason}
                    </div>
                  )}

                  {/* Reviewer info */}
                  {req.status !== 'pending' && req.reviewedAt && (
                    <div style={{ fontSize: '11px', color: 'var(--text-faint)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                      Reviewed on {new Date(req.reviewedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      {req.reviewedBy?.name ? ` by ${req.reviewedBy.name}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '36px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontWeight: 500, color: 'var(--text)' }}>No material requests yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {isTL
                ? 'As Team Leader, you can request hardware and components from Guitar inventory above.'
                : 'Material requests made by the Team Leader will appear here.'}
            </div>
          </div>
        )}
      </div>

      {/* Request Materials Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-modal-title"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stable Header */}
            <div className="modal-header">
              <div>
                <h3 id="material-modal-title" style={{ margin: 0, fontSize: '18px', color: 'var(--text)', fontWeight: 600 }}>
                  Request Materials from Guitar Inventory
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Direct request to Project Admin for hardware allocation.
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Form wrapping body and stable footer */}
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Dedicated Scrollable Body */}
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

                  {/* 1. Inventory Item Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Select Material from Guitar Inventory <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    {loadingInventory ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 0' }}>Loading inventory items...</div>
                    ) : (
                      <select
                        value={selectedItemId}
                        onChange={(e) => {
                          setSelectedItemId(e.target.value);
                          setQuantity(1);
                        }}
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
                      >
                        <option value="" disabled>-- Choose an item --</option>
                        {inventoryItems.map(item => (
                          <option key={item._id} value={item._id} disabled={item.availableQuantity <= 0}>
                            {item.name} {item.category ? `(${item.category})` : ''} — {item.availableQuantity > 0 ? `${item.availableQuantity} available` : 'Out of Stock'}
                          </option>
                        ))}
                      </select>
                    )}

                    {selectedItem && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '13px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>Stock Status:</span>
                            <span
                              style={{
                                color: selectedItem.availableQuantity > 0 ? 'var(--success)' : 'var(--danger)',
                                background: selectedItem.availableQuantity > 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                fontSize: '12px',
                              }}
                            >
                              {selectedItem.availableQuantity > 0 ? `${selectedItem.availableQuantity} units available` : 'Out of stock'}
                            </span>
                          </div>
                          {selectedItem.location && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              📍 Location: {selectedItem.location}
                            </span>
                          )}
                        </div>
                        {selectedItem.description && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.4 }}>
                            {selectedItem.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Specifications or Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Material Specifications or Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 5V 2-channel relay module, 16x2 I2C LCD, or required voltage/dimension"
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
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 3. Requested Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Requested Quantity <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxAvailable || 1}
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
                    {Number(quantity) > maxAvailable && maxAvailable > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px', fontWeight: 500 }}>
                        ⚠️ Requested quantity exceeds currently available stock of {maxAvailable} units.
                      </div>
                    )}
                  </div>

                  {/* 4. Reason */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      Reason or Requirement Explanation <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain why this material is required for the project and which milestone, experiment, or task it supports..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
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
                        resize: 'vertical',
                        lineHeight: 1.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 5. Reference Document Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                      Reference Document (Optional)
                    </label>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Datasheet, component specification sheet, or circuit schematic (PDF, DOC, DOCX up to 10MB).
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

                  {/* 6. Reference Image Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                      Reference Component Photo (Optional)
                    </label>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Photo or diagram showing the required hardware component (JPG, PNG, WEBP up to 5MB).
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
                          alt="Component Preview"
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
                  disabled={submitting || (Number(quantity) > maxAvailable) || maxAvailable <= 0}
                  style={{ minWidth: '160px' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
