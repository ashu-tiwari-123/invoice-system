import { NavLink } from "react-router-dom";
import {
  HiHome,
  HiDocumentText,
  HiClipboardList,
  HiUsers,
  HiShoppingBag,
  HiShoppingCart,
  HiCash,
  HiChartBar,
  HiOfficeBuilding,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
} from "react-icons/hi";
import { FiAlignCenter } from "react-icons/fi";
import { useState, useEffect } from "react";
import { IoCloseCircleSharp } from "react-icons/io5";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: HiHome },
  { name: "Invoices", path: "/invoices", icon: HiDocumentText },
  { name: "Quotations", path: "/quotations", icon: HiClipboardList },
  { name: "Customers", path: "/customers", icon: HiUsers },
  { name: "Products", path: "/products", icon: HiShoppingBag },
  { name: "Purchases", path: "/purchases", icon: HiShoppingCart },
  { name: "Expenses", path: "/expenses", icon: HiCash },
  { name: "Reports", path: "/reports", icon: HiChartBar },
];

function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Close sidebar on mobile when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      {!isMobileOpen && (
        <button
          className="lg:hidden fixed top-4.5 left-4 z-50 p-1 rounded-md bg-primary text-white shadow-md"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
        >
          <FiAlignCenter className="w-5 h-5" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <aside
        className={`${isDesktopCollapsed ? "w-20" : "w-64"} bg-surface border-r border-border fixed lg:static inset-y-0 left-0 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-all duration-300 ease-in-out z-40 h-screen p-4 shadow-lg lg:shadow-none`}
      >
        {/* Mobile close button - positioned at top right */}

        {/* Header with toggle button */}
        <div
          className={`flex items-center justify-${isDesktopCollapsed ? "center" : "between"} mb-6 mt-2`}
        >
          {(!isDesktopCollapsed || isMobileOpen) && (
            <h2 className="text-2xl font-bold text-primary flex items-center">
              <HiOfficeBuilding className="mr-2" />
              IMS
            </h2>
          )}

          {/* Desktop collapse toggle - only show when not on mobile */}
          <button
            className="hidden lg:flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100 text-text/70 hover:text-text"
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            aria-label={
              isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {isDesktopCollapsed ? (
              <HiChevronDoubleRight className="w-4 h-4" />
            ) : (
              <HiChevronDoubleLeft className="w-4 h-4" />
            )}
          </button>
          {isMobileOpen && (
            <button
              className="flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100 text-text/70 hover:text-text"
              onClick={() => setIsMobileOpen(false)}
            >
              <IoCloseCircleSharp className="w-5 h-5 text-red-600" />
            </button>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-3 rounded-lg transition-colors group ${
                    isActive
                      ? "bg-primary text-white font-medium"
                      : "text-text hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!isDesktopCollapsed || isMobileOpen) && (
                  <span className="ml-3">{item.name}</span>
                )}
                {isDesktopCollapsed && !isMobileOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-text text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
