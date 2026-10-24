/* The loading state keeps the dashboard's exact composition: head, stat strip,
   then the same seven blocks in the same places, so nothing jumps on arrival. */
export function DashboardSkeleton() {
  return (
    <div className="sd-dash sd-skel" aria-busy="true" aria-label="Loading your dashboard" role="status">
      <div className="ui-page-head sd-head">
        <div className="ui-page-head__text sd-head__text">
          <div className="ui-skel sd-skel__title" />
          <div className="ui-skel sd-skel__meta" />
        </div>
        <div className="sd-head__actions">
          <div className="ui-skel sd-skel__key" />
          <div className="ui-skel sd-skel__key sd-skel__key--wide" />
        </div>
      </div>

      <div className="ui-stats sd-stats">
        {[0, 1, 2, 3].map((index) => (
          <div className="ui-stat" key={index}>
            <div className="ui-skel sd-skel__stat-value" />
            <div className="ui-skel sd-skel__stat-label" />
          </div>
        ))}
      </div>

      <div className="sd-compose">
        <section className="ui-panel sd-next" aria-hidden="true">
          <div className="ui-panel__head">
            <div className="ui-skel sd-skel__panel-title" />
            <div className="ui-skel sd-skel__key sd-skel__key--sm" />
          </div>
          <div className="sd-skel__lead">
            <div className="ui-skel sd-skel__date" />
            <div className="sd-skel__lead-copy">
              <div className="ui-skel sd-skel__line sd-skel__line--xs" />
              <div className="ui-skel sd-skel__line sd-skel__line--lg" />
              <div className="ui-skel sd-skel__line sd-skel__line--sm" />
            </div>
            <div className="ui-skel sd-skel__count" />
          </div>
          <div className="sd-skel__rows">
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
          </div>
        </section>

        <section className="ui-panel sd-notes" aria-hidden="true">
          <div className="ui-panel__head">
            <div className="ui-skel sd-skel__panel-title" />
          </div>
          <div className="sd-skel__rows">
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
          </div>
          <div className="ui-skel sd-skel__foot" />
        </section>

        <section className="ui-panel sd-clubs" aria-hidden="true">
          <div className="ui-panel__head">
            <div className="ui-skel sd-skel__panel-title" />
            <div className="ui-skel sd-skel__key sd-skel__key--sm" />
          </div>
          <div className="sd-skel__rows">
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
          </div>
        </section>

        <section className="ui-panel sd-projects" aria-hidden="true">
          <div className="ui-panel__head">
            <div className="ui-skel sd-skel__panel-title" />
            <div className="ui-skel sd-skel__key sd-skel__key--sm" />
          </div>
          <div className="sd-skel__rows">
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
            <div className="ui-skel sd-skel__row" />
          </div>
        </section>

        <section className="sd-strip sd-skel__strip" aria-hidden="true">
          <div className="ui-skel sd-skel__line sd-skel__line--sm" />
          <div className="sd-skel__chips">
            <div className="ui-skel sd-skel__chip" />
            <div className="ui-skel sd-skel__chip" />
          </div>
        </section>
      </div>

      <span className="ui-visually-hidden">Loading your dashboard</span>
    </div>
  );
}
