import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import { usePageLoading } from '../../context/LoadingContext';
import './ops.css';

interface InventoryPerson {
  _id?: string;
  name?: string;
  email?: string;
  department?: string;
}

interface InventoryItem {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  totalQuantity: number;
  availableQuantity: number;
  location?: string;
  createdBy?: InventoryPerson;
  createdAt?: string;
  updatedAt?: string;
}

interface Allocation {
  _id: string;
  quantity?: number;
  allocatedAt?: string;
  inventoryItemId?: { _id?: string; name?: string };
  projectId?: { _id?: string; name?: string };
  allocatedBy?: InventoryPerson;
  materialRequestId?: { quantity?: number };
}

interface ItemForm {
  name: string;
  description: string;
  category: string;
  totalQuantity: number;
  location: string;
}

type StockState = 'ok' | 'low' | 'out';

const EMPTY_FORM: ItemForm = {
  name: '',
  description: '',
  category: '',
  totalQuantity: 0,
  location: '',
};

// MOCK: GuitarInventory has no minimum-stock field. "Low" is a presentation rule
// (under a quarter of the item's own total still on the shelf); it never changes data.
const LOW_STOCK_RATIO = 0.25;

const stockState = (item: InventoryItem): StockState => {
  if (item.availableQuantity <= 0) return 'out';
  if (item.totalQuantity > 0 && item.availableQuantity / item.totalQuantity < LOW_STOCK_RATIO) return 'low';
  return 'ok';
};

const formatDay = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    : 'Unknown';

const formatStamp = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RestockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
      <path d="M4 9v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
      <path d="M12 12v5M9.5 14.5h5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 5.5 3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
      <path d="M4 8l2-4h12l2 4M9 12h6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M20 11a8 8 0 1 0-2.3 6.3" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function Inventory() {
  const { setPageLoading } = usePageLoading();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  // Form: create + edit share one modal and one body shape.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<ItemForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [restock, setRestock] = useState<InventoryItem | null>(null);
  const [restockMode, setRestockMode] = useState<'increase' | 'decrease'>('increase');
  const [restockAmount, setRestockAmount] = useState(1);
  const [restockError, setRestockError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<InventoryItem | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const focusReturn = useRef<HTMLElement | null>(null);

  const loadData = async () => {
    try {
      setPageLoading(true);
      setError(null);
      const [invRes, allocRes] = await Promise.all([
        api<any>('GET', '/inventory'),
        api<any>('GET', '/allocations').catch(() => ({ data: [] })),
      ]);
      setItems(invRes.data);
      setAllocations(allocRes.data || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category?.trim()).filter(Boolean) as string[])).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    // MOCK: search and the category filter run client-side; GET /inventory returns the full list.
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'all' && (item.category || '') !== category) return false;
      if (!needle) return true;
      return [item.name, item.description, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [items, query, category]);

  const totals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const availableUnits = items.reduce((sum, item) => sum + (item.availableQuantity || 0), 0);
    const lowCount = items.filter((item) => stockState(item) !== 'ok').length;
    const projectCount = new Set(allocations.map((a) => a.projectId?._id).filter(Boolean)).size;
    const lastUpdated = items.reduce<string | undefined>((latest, item) => {
      if (!item.updatedAt) return latest;
      return !latest || new Date(item.updatedAt) > new Date(latest) ? item.updatedAt : latest;
    }, undefined);
    return {
      totalUnits,
      availableUnits,
      allocatedUnits: Math.max(totalUnits - availableUnits, 0),
      lowCount,
      projectCount,
      lastUpdated,
    };
  }, [items, allocations]);

  const rememberFocus = () => {
    focusReturn.current = document.activeElement as HTMLElement | null;
  };
  const restoreFocus = () => {
    window.requestAnimationFrame(() => focusReturn.current?.focus());
  };

  const openCreate = () => {
    rememberFocus();
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    rememberFocus();
    setEditing(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      totalQuantity: item.totalQuantity || 0,
      location: item.location || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    restoreFocus();
  };

  const openRestock = (item: InventoryItem) => {
    rememberFocus();
    setRestock(item);
    setRestockMode('increase');
    setRestockAmount(1);
    setRestockError(null);
  };

  const closeRestock = () => {
    setRestock(null);
    setRestockError(null);
    restoreFocus();
  };

  const openRemove = (item: InventoryItem) => {
    rememberFocus();
    setRemoveTarget(item);
    setRemoveError(null);
  };

  const closeRemove = () => {
    setRemoveTarget(null);
    setRemoveError(null);
    restoreFocus();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setSaving(true);
      await api('POST', '/inventory', formData);
      setFormOpen(false);
      setFormData(EMPTY_FORM);
      await loadData();
      restoreFocus();
    } catch (e: any) {
      setFormError(e.message || 'Failed to create inventory item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    try {
      setSaving(true);
      await api('PUT', `/inventory/${editing._id}`, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        location: formData.location,
      });
      setFormOpen(false);
      setEditing(null);
      await loadData();
      restoreFocus();
    } catch (e: any) {
      setFormError(e.message || 'Failed to update inventory item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setRemoving(true);
      setRemoveError(null);
      await api('DELETE', `/inventory/${id}`);
      setRemoveTarget(null);
      await loadData();
      restoreFocus();
    } catch (e: any) {
      setRemoveError(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  };

  const handleAdjustQuantity = async (id: string, amount: number) => {
    try {
      setAdjusting(true);
      setRestockError(null);
      const action = amount > 0 ? 'increase' : 'decrease';
      await api('PATCH', `/inventory/${id}/quantity`, { action, amount: Math.abs(amount) });
      await loadData();
      setRestock(null);
      restoreFocus();
    } catch (e: any) {
      setRestockError(e.message || 'Failed to adjust quantity');
    } finally {
      setAdjusting(false);
    }
  };

  const submitRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restock) return;
    const amount = Math.max(1, Math.floor(restockAmount || 0));
    handleAdjustQuantity(restock._id, restockMode === 'increase' ? amount : -amount);
  };

  useEffect(() => {
    const overlayOpen = formOpen || !!restock || !!removeTarget;
    if (!overlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (formOpen) closeForm();
      else if (restock) closeRestock();
      else closeRemove();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [formOpen, restock, removeTarget]);

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>, close: () => void) => {
    if (event.target === event.currentTarget) close();
  };

  const restockAfter = restock
    ? restockMode === 'increase'
      ? restock.availableQuantity + Math.max(1, Math.floor(restockAmount || 0))
      : Math.max(restock.availableQuantity - Math.max(1, Math.floor(restockAmount || 0)), 0)
    : 0;

  return (
    <div className="ops-page">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Inventory</h1>
          <p className="ui-sub">
            Components and equipment the department holds, and what project teams have drawn from it.
          </p>
        </div>
        <div className="ui-page-actions ops-head-tools">
          <div className="ui-search ops-search">
            <SearchIcon />
            <label className="ui-visually-hidden" htmlFor="ops-inventory-search">Search inventory</label>
            <input
              id="ops-inventory-search"
              className="ui-field"
              type="search"
              placeholder="Search items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          {categories.length > 0 && (
            <div className="ops-select ops-filter">
              <label className="ui-visually-hidden" htmlFor="ops-inventory-category">Filter by category</label>
              <select
                id="ops-inventory-category"
                className="ui-field ui-field--select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="all">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          )}
          <button type="button" className="ui-btn ui-btn--primary" onClick={openCreate} disabled={loading}>
            <PlusIcon />
            Add item
          </button>
        </div>
      </header>

      <div className="ops-body">
        {error && (
          <div className="ui-notice ui-notice--error" role="alert">
            <div className="ui-grow">
              <p>Inventory could not be loaded.</p>
              <p className="ops-note">{error}</p>
            </div>
            <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={loadData}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="ui-stack ui-stack--lg" aria-busy="true">
            <div className="ops-skel-stats" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <div className="ops-skel-stat" key={n}>
                  <div className="ui-skel ops-skel-line ops-skel-line--value" />
                  <div className="ui-skel ops-skel-line ops-skel-line--sm" />
                </div>
              ))}
            </div>
            <div className="ops-layout">
              <div className="ui-panel">
                <header className="ui-panel__head">
                  <div className="ui-skel ops-skel-line ops-skel-line--head" />
                </header>
                <div className="ops-skel-rows" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <div className="ops-skel-row" key={n}>
                      <div>
                        <div className="ui-skel ops-skel-line" />
                        <div className="ui-skel ops-skel-line ops-skel-line--sm" />
                      </div>
                      <div className="ui-skel ops-skel-line ops-skel-line--wide" />
                      <div className="ui-skel ops-skel-line" />
                      <div className="ui-skel ops-skel-line ops-skel-line--wide" />
                    </div>
                  ))}
                </div>
              </div>
              <aside className="ops-aside">
                <div className="ui-panel">
                  <header className="ui-panel__head">
                    <div className="ui-skel ops-skel-line ops-skel-line--head" />
                  </header>
                  <div className="ops-skel-side" aria-hidden="true">
                    {[0, 1].map((n) => (
                      <div className="ops-skel-side__row" key={n}>
                        <div className="ui-skel ops-skel-line" />
                        <div className="ui-skel ops-skel-line ops-skel-line--sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            <span className="ui-visually-hidden" role="status">Loading inventory</span>
          </div>
        ) : items.length === 0 ? (
          <div className="ui-empty">
            <span className="ui-empty__mark"><BoxIcon /></span>
            <p className="ui-empty__title">The store room is empty</p>
            <p className="ui-empty__text">
              Add the components the department holds so project team leaders can request them.
            </p>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={openCreate}>
              <PlusIcon />
              Add the first item
            </button>
          </div>
        ) : (
          <>
            <div className="ui-stats">
              <div className="ui-stat">
                <div className="ui-stat__value">{items.length}</div>
                <div className="ui-stat__label">Items</div>
                <div className="ops-stat-foot">in the store room</div>
              </div>
              <div className="ui-stat ui-stat--accent">
                <div className="ui-stat__value">{totals.availableUnits}</div>
                <div className="ui-stat__label">Available units</div>
                <div className="ops-stat-foot">of {totals.totalUnits} held</div>
              </div>
              <div className="ui-stat">
                <div className="ui-stat__value">{totals.allocatedUnits}</div>
                <div className="ui-stat__label">Allocated</div>
                <div className="ops-stat-foot">
                  {totals.allocatedUnits === 0
                    ? 'nothing is out'
                    : totals.projectCount > 0
                      ? `with ${totals.projectCount} ${totals.projectCount === 1 ? 'project' : 'projects'}`
                      : 'not on the shelf'}
                </div>
              </div>
              <div className="ui-stat">
                <div className="ui-stat__value">{totals.lowCount}</div>
                <div className="ui-stat__label">Running low</div>
                <div className="ops-stat-foot">under 25% of stock left</div>
              </div>
            </div>

            <div className="ops-layout">
              <section className="ui-panel ui-panel--accent">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 className="ui-panel__title">Stock</h2>
                    <span className="ui-panel__meta">
                      {filteredItems.length === items.length
                        ? `${items.length} ${items.length === 1 ? 'item' : 'items'}`
                        : `${filteredItems.length} of ${items.length}`}
                    </span>
                  </div>
                  <div className="ops-panel-tools">
                    <button
                      type="button"
                      className="ui-icon-btn"
                      aria-label="Refresh inventory"
                      title="Refresh"
                      onClick={loadData}
                      disabled={loading}
                    >
                      <RefreshIcon />
                    </button>
                  </div>
                </header>

                <div className="ui-panel__body ui-panel__body--flush">
                  {filteredItems.length > 0 ? (
                    <div className="ui-scroll-x">
                      <table className="ui-table ops-table">
                        <thead>
                          <tr>
                            <th scope="col">Item</th>
                            <th scope="col">Category</th>
                            <th scope="col" className="is-num">Available</th>
                            <th scope="col" className="is-num">Total</th>
                            <th scope="col">Location</th>
                            <th scope="col">Updated</th>
                            <th scope="col"><span className="ui-visually-hidden">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map((item) => {
                            const state = stockState(item);
                            const ratio = item.totalQuantity > 0
                              ? Math.max(0, Math.min(item.availableQuantity / item.totalQuantity, 1))
                              : 0;
                            return (
                              <tr key={item._id}>
                                <td>
                                  <div className="ops-item">
                                    <div className="ops-item__head">
                                      <p className="ops-item__name">{item.name}</p>
                                      {state === 'out' && <span className="ui-tag is-negative ops-item__flag">Out</span>}
                                      {state === 'low' && <span className="ui-tag is-warning ops-item__flag">Low</span>}
                                    </div>
                                    {item.description && (
                                      <p className="ops-item__desc" title={item.description}>{item.description}</p>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {item.category
                                    ? <span className="ui-tag ui-tag--plain">{item.category}</span>
                                    : <span className="ops-nil">None</span>}
                                </td>
                                <td className="is-num">
                                  <div
                                    className={`ops-stock ops-stock--${state}`}
                                    title={`${item.availableQuantity} of ${item.totalQuantity} available`}
                                  >
                                    <div className="ops-qty">
                                      <span className="ops-qty__now">{item.availableQuantity}</span>
                                      <span className="ops-qty__of">/ {item.totalQuantity}</span>
                                    </div>
                                    <div className="ui-meter" role="presentation" aria-hidden="true">
                                      <div className="ui-meter__fill" style={{ transform: `scaleX(${ratio})` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="is-num">{item.totalQuantity}</td>
                                <td>
                                  {item.location
                                    ? item.location
                                    : <span className="ops-nil" title="No location recorded">None</span>}
                                </td>
                                <td className="ops-when" title={formatStamp(item.updatedAt || item.createdAt)}>
                                  {formatDay(item.updatedAt || item.createdAt)}
                                </td>
                                <td className="ops-actions-cell">
                                  <div className="ops-row-actions">
                                    <button
                                      type="button"
                                      className="ui-icon-btn"
                                      aria-label={`Adjust stock for ${item.name}`}
                                      title="Adjust stock"
                                      onClick={() => openRestock(item)}
                                    >
                                      <RestockIcon />
                                    </button>
                                    <button
                                      type="button"
                                      className="ui-icon-btn"
                                      aria-label={`Edit ${item.name}`}
                                      title="Edit item"
                                      onClick={() => openEdit(item)}
                                    >
                                      <EditIcon />
                                    </button>
                                    <button
                                      type="button"
                                      className="ui-icon-btn ops-icon--danger"
                                      aria-label={`Delete ${item.name}`}
                                      title="Delete item"
                                      onClick={() => openRemove(item)}
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ops-empty-wrap">
                      <div className="ui-empty">
                        <span className="ui-empty__mark"><SearchIcon /></span>
                        <p className="ui-empty__title">No items match</p>
                        <p className="ui-empty__text">
                          Nothing in stock matches that search{category !== 'all' ? ' and category' : ''}.
                        </p>
                        <button
                          type="button"
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                          onClick={() => {
                            setQuery('');
                            setCategory('all');
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <footer className="ui-panel__foot">
                  <span className="ops-list-foot">
                    Showing {filteredItems.length} of {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                  <span className="ops-list-foot">Updated {formatStamp(totals.lastUpdated)}</span>
                </footer>
              </section>

              <aside className="ops-aside">
                <section className="ui-panel">
                  <header className="ui-panel__head">
                    <div className="ui-panel__titles">
                      <h2 className="ui-panel__title">Allocations</h2>
                      <span className="ui-panel__meta">{allocations.length}</span>
                    </div>
                  </header>
                  <div className="ui-panel__body ui-panel__body--flush">
                    {allocations.length > 0 ? (
                      <ul className="ui-rows ops-alloc-scroll">
                        {allocations.map((allocation) => (
                          <li className="ui-row ops-alloc" key={allocation._id}>
                            <span className="ops-alloc__delta">
                              −{allocation.materialRequestId?.quantity || 1}
                            </span>
                            <div className="ui-row__main">
                              <p className="ui-row__title">
                                {allocation.inventoryItemId?.name || 'Deleted item'}
                              </p>
                              <p className="ui-row__sub">
                                {allocation.projectId?.name || 'Unknown project'}
                              </p>
                              <p
                                className="ops-alloc__by"
                                title={[
                                  allocation.allocatedBy?.name,
                                  allocation.allocatedBy?.email,
                                  allocation.allocatedBy?.department,
                                  formatStamp(allocation.allocatedAt),
                                ].filter(Boolean).join(' · ')}
                              >
                                Approved by {allocation.allocatedBy?.name || 'Unknown'} · {formatDay(allocation.allocatedAt)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ops-empty">
                        <p className="ops-empty__title">No allocations yet</p>
                        <p>Stock leaves the store room when a material request is approved.</p>
                      </div>
                    )}
                  </div>
                  <p className="ops-aside-note">
                    Each approval deducts the requested quantity once and records it here.
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <div className="ui-overlay" onMouseDown={(event) => closeOnBackdrop(event, closeForm)}>
          <div
            className="ui-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-item-form-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 className="ui-h2" id="ops-item-form-title">
                  {editing ? 'Edit item' : 'Add inventory item'}
                </h2>
                <p className="ops-modal__sub">
                  {editing
                    ? 'Name, category, description and location. Stock is changed from Restock.'
                    : 'The item is added with its full quantity available to issue.'}
                </p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={closeForm} autoFocus>
                <CloseIcon />
              </button>
            </header>
            <form onSubmit={editing ? handleUpdate : handleCreate}>
              <div className="ui-modal__body">
                <div className="ops-form-grid">
                  <div className="ops-field--wide">
                    <label className="ui-label" htmlFor="ops-item-name">Item name</label>
                    <input
                      id="ops-item-name"
                      className="ui-field"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="ui-label" htmlFor="ops-item-category">Category</label>
                    <input
                      id="ops-item-category"
                      className="ui-field"
                      type="text"
                      list="ops-item-categories"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      autoComplete="off"
                    />
                    <datalist id="ops-item-categories">
                      {categories.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                    <p className="ui-hint">Optional. Groups the item and powers the filter.</p>
                  </div>

                  <div>
                    <label className="ui-label" htmlFor="ops-item-quantity">Total quantity</label>
                    {editing ? (
                      <div className="ops-readonly">
                        <span>Available {editing.availableQuantity} of {editing.totalQuantity}</span>
                        <strong>Restock</strong>
                      </div>
                    ) : (
                      <input
                        id="ops-item-quantity"
                        className="ui-field"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.totalQuantity}
                        onChange={(e) => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })}
                        required
                      />
                    )}
                    {editing && (
                      <p className="ui-hint">Change quantity from Restock so available stock stays in step.</p>
                    )}
                  </div>

                  <div className="ops-field--wide">
                    <label className="ui-label" htmlFor="ops-item-description">Description</label>
                    <textarea
                      id="ops-item-description"
                      className="ui-field ui-field--area"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="ops-field--wide">
                    <label className="ui-label" htmlFor="ops-item-location">Location</label>
                    <input
                      id="ops-item-location"
                      className="ui-field"
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      autoComplete="off"
                    />
                    <p className="ui-hint">Where the item is kept, for example a cupboard or lab shelf.</p>
                  </div>
                </div>

                {formError && (
                  <div className="ui-notice ui-notice--error ops-form-error" role="alert">
                    {formError}
                  </div>
                )}
              </div>
              <footer className="ui-modal__foot">
                <button type="button" className="ui-btn ui-btn--ghost" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn ui-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {restock && (
        <div className="ui-overlay" onMouseDown={(event) => closeOnBackdrop(event, closeRestock)}>
          <div
            className="ui-modal ui-modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-restock-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 className="ui-h2" id="ops-restock-title">Adjust stock</h2>
                <p className="ops-modal__sub">{restock.name}</p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={closeRestock} autoFocus>
                <CloseIcon />
              </button>
            </header>
            <form onSubmit={submitRestock}>
              <div className="ui-modal__body">
                <div className="ui-stack">
                  <div className="ops-restock__now">
                    <div>
                      <div className="ops-restock__label">Available now</div>
                      <div className="ops-restock__num">
                        {restock.availableQuantity}
                        <span className="ops-restock__of"> / {restock.totalQuantity}</span>
                      </div>
                    </div>
                    <div>
                      <div className="ops-restock__label">After change</div>
                      <div className="ops-restock__num">
                        {restockAfter}
                        <span className="ops-restock__of">
                          {' '}/ {restockMode === 'increase'
                            ? restock.totalQuantity + Math.max(1, Math.floor(restockAmount || 0))
                            : restock.totalQuantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="ui-label" id="ops-restock-movement">Movement</span>
                    <div className="ui-seg" role="group" aria-labelledby="ops-restock-movement">
                      <button
                        type="button"
                        aria-pressed={restockMode === 'increase'}
                        onClick={() => setRestockMode('increase')}
                      >
                        Add stock
                      </button>
                      <button
                        type="button"
                        aria-pressed={restockMode === 'decrease'}
                        onClick={() => setRestockMode('decrease')}
                      >
                        Remove stock
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="ui-label" htmlFor="ops-restock-amount">Quantity</label>
                    <input
                      id="ops-restock-amount"
                      className="ui-field"
                      type="number"
                      min="1"
                      step="1"
                      value={restockAmount}
                      onChange={(e) => setRestockAmount(parseInt(e.target.value) || 1)}
                      required
                    />
                    <div className="ops-chips">
                      {[1, 5, 10].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                          aria-pressed={restockAmount === amount}
                          onClick={() => setRestockAmount(amount)}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {restockError && (
                  <div className="ui-notice ui-notice--error ops-form-error" role="alert">
                    {restockError}
                  </div>
                )}
              </div>
              <footer className="ui-modal__foot">
                <button type="button" className="ui-btn ui-btn--ghost" onClick={closeRestock} disabled={adjusting}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn ui-btn--primary" disabled={adjusting}>
                  {adjusting ? 'Updating…' : restockMode === 'increase' ? 'Add stock' : 'Remove stock'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="ui-overlay" onMouseDown={(event) => closeOnBackdrop(event, closeRemove)}>
          <div
            className="ui-modal ui-modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-delete-title"
          >
            <header className="ui-modal__head">
              <div>
                <h2 className="ui-h2" id="ops-delete-title">Delete item</h2>
                <p className="ops-modal__sub">This cannot be undone.</p>
              </div>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={closeRemove} autoFocus>
                <CloseIcon />
              </button>
            </header>
            <div className="ui-modal__body">
              <p>
                Delete <strong>{removeTarget.name}</strong> from the store room? Existing allocation records
                are kept.
              </p>
              {removeError && (
                <div className="ui-notice ui-notice--error ops-form-error" role="alert">
                  {removeError}
                </div>
              )}
            </div>
            <footer className="ui-modal__foot">
              <button type="button" className="ui-btn ui-btn--ghost" onClick={closeRemove} disabled={removing}>
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--danger"
                onClick={() => handleDelete(removeTarget._id)}
                disabled={removing}
              >
                {removing ? 'Deleting…' : 'Delete item'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
