/** Full-screen placeholder shared by the auth gate and the restore step. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-desk">
      <p className="text-sm text-gray-text">Loading…</p>
    </div>
  );
}
