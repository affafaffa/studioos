export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-10">
          🎬 StudioOS
        </h1>

        <nav className="space-y-4">
          <p>🏠 Dashboard</p>
          <p>💡 Ideas</p>
          <p>🎬 Videos</p>
          <p>📁 Assets</p>
          <p>🖼️ Thumbnails</p>
          <p>👥 Characters</p>
          <p>📈 Analytics</p>
          <p>🤖 Brainstorm</p>
          <p>⚙️ Settings</p>
        </nav>
      </aside>

      {/* Main */}
      <section className="flex-1 p-10">
        <h2 className="text-4xl font-bold">
          Dashboard
        </h2>

        <div className="grid grid-cols-4 gap-6 mt-10">

          <div className="bg-white rounded-xl p-6 shadow">
            <p>Videos</p>
            <h3 className="text-3xl font-bold">0</h3>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <p>Ideas</p>
            <h3 className="text-3xl font-bold">0</h3>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <p>Views</p>
            <h3 className="text-3xl font-bold">0</h3>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <p>Revenue</p>
            <h3 className="text-3xl font-bold">$0</h3>
          </div>

        </div>
      </section>
    </main>
  );
}