export function Navbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">AI Equity Research Platform</p>
        <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
      </div>

      <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
        Demo User
      </div>
    </header>
  );
}