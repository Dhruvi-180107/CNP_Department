export default function LoadingScreen() {
  return (
    <div className="cnp-loading-screen" role="status" aria-label="Loading">
      <svg className="cnp-loading-mark" viewBox="0 0 160 120" aria-hidden="true">
        <rect className="cnp-loading-frame" x="8" y="8" width="144" height="104" />
      </svg>
      <span className="cnp-loading-caption">Loading your campus workspace</span>
    </div>
  );
}
