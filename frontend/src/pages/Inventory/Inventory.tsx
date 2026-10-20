import { useEffect, useState } from 'react';
import { UserDisplay } from '../../components/UserDisplay';
import { api } from '../../services/api';
import { usePageLoading } from '../../context/LoadingContext';
import LoadingScreen from '../../components/LoadingScreen';

export default function Inventory() {
  const { setPageLoading } = usePageLoading();
  const [items, setItems] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category: '', totalQuantity: 0, location: '' });

  const loadData = async () => {
    try {
      setPageLoading(true);
      const [invRes, allocRes] = await Promise.all([
        api<any>('GET', '/inventory'),
        api<any>('GET', '/allocations').catch(() => ({ data: [] }))
      ]);
      setItems(invRes.data);
      setAllocations(allocRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('POST', '/inventory', formData);
      setShowForm(false);
      setFormData({ name: '', description: '', category: '', totalQuantity: 0, location: '' });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to create inventory item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await api('DELETE', `/inventory/${id}`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  const handleAdjustQuantity = async (id: string, amount: number) => {
    try {
      const action = amount > 0 ? 'increase' : 'decrease';
      await api('PATCH', `/inventory/${id}/quantity`, { action, amount: Math.abs(amount) });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to adjust quantity');
    }
  };

  if (loading) return <LoadingScreen isReady={!loading} />;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, marginBottom: '8px' }}>Guitar Inventory</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage available equipment and track project allocations.</p>
        </div>
        <button className={showForm ? "btn btn-outline" : "btn btn-primary"} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Inventory Item'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ margin: 0 }}>New Inventory Item</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Item Name</label>
                <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Category</label>
                <input type="text" className="input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
                <input type="text" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Quantity</label>
                <input type="number" className="input" min="0" value={formData.totalQuantity} onChange={e => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })} required />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Location</label>
                <input type="text" className="input" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* INVENTORY ITEMS LIST */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text)' }}>Current Inventory</h3>
          {items.length ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {items.map(item => (
                <div key={item._id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>{item.name}</h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className="badge" style={{ fontSize: '11px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                          {item.category || 'Uncategorized'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📍 {item.location || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => handleDelete(item._id)}>Delete</button>
                  </div>
                  
                  <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px' }}>Available</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>{item.availableQuantity}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px' }}>Total</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-faint)' }}>{item.totalQuantity}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-outline" onClick={() => handleAdjustQuantity(item._id, -1)} style={{ padding: '8px 12px' }}>- 1</button>
                      <button className="btn btn-outline" onClick={() => handleAdjustQuantity(item._id, 1)} style={{ padding: '8px 12px' }}>+ 1</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              No inventory items. Add some equipment!
            </div>
          )}
        </div>

        {/* ALLOCATION HISTORY */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text)' }}>Recent Allocations</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto', padding: 0 }}>
              {allocations.length ? allocations.map(a => (
                <div key={a._id} style={{ borderBottom: '1px solid var(--border)', padding: '16px', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{a.inventoryItemId?.name}</strong>
                    <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '11px', fontWeight: 600 }}>
                      -{a.materialRequestId?.quantity || 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-faint)' }}>
                    <div><span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>To:</span> {a.projectId?.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Approved by:</span> {a.allocatedBy ? <UserDisplay user={a.allocatedBy} /> : 'Unknown'}</div>
                    <div style={{ marginTop: '4px' }}>{new Date(a.allocatedAt).toLocaleString()}</div>
                  </div>
                </div>
              )) : <div className="empty-state" style={{ padding: '32px 16px' }}>No allocations recorded yet.</div>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
