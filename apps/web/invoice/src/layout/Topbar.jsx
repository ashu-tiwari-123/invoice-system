import {
  HiLogout,
  HiUserCircle,
  HiCog,
  HiX,
  HiOfficeBuilding,
} from "react-icons/hi";
import { useState, useRef, useEffect } from "react";

function Topbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="flex items-center justify-between bg-surface border-b border-border px-4 md:px-6 py-3 shadow-sm sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-text pl-10 lg:pl-0">
        Dashboard
      </h1>

      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Notifications
        <button 
          className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <HiBell className="w-5 h-5 text-text" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
        </button> */}

        {/* Profile Section with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="hidden sm:flex items-center space-x-2">
              <img
                src="https://i.pravatar.cc/40"
                alt="profile"
                className="w-8 h-8 rounded-full border-2 border-primary/20"
              />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-text">Ashutosh</span>
                <span className="text-xs text-text/60">Admin</span>
              </div>
            </div>
            <div className="sm:hidden">
              <HiUserCircle className="w-8 h-8 text-primary" />
            </div>
          </button>

          {/* Dropdown Modal */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border py-1 z-50">
              {/* Close button */}
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
                aria-label="Close dropdown"
              >
                <HiX className="w-4 h-4 text-text/70" />
              </button>

              {/* Dropdown header */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-text">Signed in as</p>
                <p className="text-sm text-primary truncate">
                  ashutosh@example.com
                </p>
              </div>

              {/* Dropdown options */}
              <div className="py-1">
                <button className="flex items-center w-full px-4 py-2 text-sm text-text hover:bg-gray-100 transition-colors">
                  <HiUserCircle className="w-4 h-4 mr-3 text-text/70" />
                  Profile
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-text hover:bg-gray-100 transition-colors">
                  <HiOfficeBuilding className="w-4 h-4 mr-3 text-text/70" />
                  Company
                </button>

                <button className="flex items-center w-full px-4 py-2 text-sm text-text hover:bg-gray-100 transition-colors">
                  <HiCog className="w-4 h-4 mr-3 text-text/70" />
                  Settings
                </button>
              </div>

              {/* Dropdown footer with logout */}
              <div className="py-1 border-t border-border">
                <button className="flex items-center w-full px-4 py-2 text-sm text-text hover:bg-gray-100 transition-colors">
                  <HiLogout className="w-4 h-4 mr-3 text-text/70" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
