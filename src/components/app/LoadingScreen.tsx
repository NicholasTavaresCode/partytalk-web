export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface text-on-surface-variant">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
