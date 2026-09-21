export function LandingPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-0">
      <iframe
        src="/landing.html"
        className="h-full w-full border-0"
        title="PrecisionJournal landing"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
