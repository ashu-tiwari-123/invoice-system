function Topbar() {
  return (
    <header className="flex items-center justify-between bg-surface border-b border-gray-200 px-6 py-3 shadow-sm">
      <h1 className="text-lg font-semibold text-textPrimary">Dashboard</h1>

      <div className="flex items-center space-x-4">
        {/* Profile */}
        <div className="flex items-center space-x-2">
          <img
            src="https://i.pravatar.cc/40"
            alt="profile"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm font-medium text-textPrimary">Ashutosh</span>
        </div>

        {/* Logout */}
        <button className="bg-danger text-white px-3 py-1 rounded text-sm hover:bg-red-700">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
