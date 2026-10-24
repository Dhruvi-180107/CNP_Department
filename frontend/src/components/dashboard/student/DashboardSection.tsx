import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertIcon, ArrowRightIcon } from './StudentIcons';

interface DashboardSectionProps {
  id: string;
  title: string;
  /** A short fact beside the title — a count, a window, a state. */
  meta?: string;
  actionLabel?: string;
  /** Navigates (preferred) or fires a callback. */
  actionTo?: string;
  onAction?: () => void;
  /** Marks the page's one emphasised object. */
  accent?: boolean;
  /** A quiet looping mark beside the title (the page's single live affordance). */
  live?: boolean;
  className?: string;
  children: ReactNode;
}

export function DashboardSection({
  id,
  title,
  meta,
  actionLabel,
  actionTo,
  onAction,
  accent = false,
  live = false,
  className = '',
  children,
}: DashboardSectionProps) {
  const actionClass = 'ui-btn ui-btn--quiet ui-btn--sm sd-panel__action';

  return (
    <section
      className={`ui-panel${accent ? ' ui-panel--accent' : ''} ${className}`.trim()}
      aria-labelledby={`${id}-heading`}
    >
      <header className="ui-panel__head">
        <div className="ui-panel__titles">
          <h2 className="ui-panel__title" id={`${id}-heading`}>
            {title}
          </h2>
          {live ? <span className="sd-live" aria-hidden="true" /> : null}
          {meta ? <span className="ui-panel__meta">{meta}</span> : null}
        </div>
        {actionLabel && actionTo ? (
          <Link className={actionClass} to={actionTo}>
            {actionLabel}
            <ArrowRightIcon className="sd-icon sd-icon--sm sd-arrow" />
          </Link>
        ) : actionLabel && onAction ? (
          <button type="button" className={actionClass} onClick={onAction}>
            {actionLabel}
            <ArrowRightIcon className="sd-icon sd-icon--sm sd-arrow" />
          </button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** A failed fetch stated in place, without pretending the rest of the page is empty. */
export function PanelError({ message }: { message: string }) {
  return (
    <div className="sd-panel__state">
      <p className="ui-notice ui-notice--error sd-error" role="alert">
        <AlertIcon className="sd-icon sd-icon--sm" />
        <span>{message}</span>
      </p>
    </div>
  );
}
