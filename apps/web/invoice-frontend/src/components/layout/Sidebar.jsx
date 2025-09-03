import { NavLink } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Invoices", path: "/invoices" },
  { name: "Quotations", path: "/quotations" },
  { name: "Customers", path: "/customers" },
  { name: "Products", path: "/products" },
  { name: "Purchases", path: "/purchases" },
  { name: "Expenses", path: "/expenses" },
  { name: "Reports", path: "/reports" },
  { name: "Company", path: "/company" },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-surface border-r border-gray-200 h-screen p-4">
      <h2 className="text-2xl font-bold text-primary mb-6">IMS</h2>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md ${
                isActive
                  ? "bg-primary text-white font-medium"
                  : "text-textSecondary hover:bg-gray-100"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
