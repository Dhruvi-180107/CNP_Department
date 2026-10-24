import { Outlet, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './shell.css';

/**
 * The frame every signed-in route is drawn inside: a graphite rail, a light header,
 * and one scrollable content column. Pages render into `.shell-content` with no
 * outer margins of their own.
 */
export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // A route change always leaves the drawer behind.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  /** Closing by keyboard or scrim returns focus to the control that opened it. */
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.hdr-menu-toggle')?.focus();
    });
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    // The drawer is modal on small screens: focus lands inside it.
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.rail-close')?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className={`shell${drawerOpen ? ' is-drawer-open' : ''}`}>
      <aside className="shell-rail" id="shell-rail" aria-label="Primary navigation">
        <Sidebar onClose={closeDrawer} />
      </aside>

      {drawerOpen && <div className="shell-scrim" onClick={closeDrawer} aria-hidden="true" />}

      <div className="shell-main">
        <Header
          drawerOpen={drawerOpen}
          onToggleMenu={() => (drawerOpen ? closeDrawer() : openDrawer())}
        />
        <main className="shell-content" id="content-area" aria-labelledby="shell-page-title">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
