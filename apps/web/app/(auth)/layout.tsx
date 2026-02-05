export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-valtric-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-teal-700 flex items-center justify-center shadow-md">
              <span className="text-white font-display font-semibold text-xl">V</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-body font-semibold text-lg text-teal-900">Valtric</span>
              <span className="text-xs text-teal-600 -mt-0.5">AI for Everyone</span>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-teal-100 rounded-2xl shadow-card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
