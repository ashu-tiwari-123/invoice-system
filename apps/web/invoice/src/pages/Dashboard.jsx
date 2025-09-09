import { HiTrendingUp, HiUsers, HiDocumentText, HiCurrencyRupee } from "react-icons/hi";

export default function Dashboard() {
  const stats = [
    { title: "Total Revenue", value: "₹1,25,480", change: "+12.5%", icon: HiTrendingUp, color: "text-green-600" },
    { title: "Customers", value: "1,248", change: "+8.2%", icon: HiUsers, color: "text-blue-600" },
    { title: "Invoices", value: "324", change: "+5.7%", icon: HiDocumentText, color: "text-purple-600" },
    { title: "Pending Payments", value: "₹24,560", change: "-3.2%", icon: HiCurrencyRupee, color: "text-red-600" },
  ];

  const recentInvoices = [
    { id: "INV-001", customer: "Rajesh Kumar", amount: "₹8,500", status: "Paid", date: "12 Nov 2023" },
    { id: "INV-002", customer: "Meena Enterprises", amount: "₹12,300", status: "Pending", date: "11 Nov 2023" },
    { id: "INV-003", customer: "Sunil Traders", amount: "₹6,800", status: "Paid", date: "10 Nov 2023" },
    { id: "INV-004", customer: "Ankit Industries", amount: "₹15,200", status: "Overdue", date: "08 Nov 2023" },
    { id: "INV-005", customer: "Priya Stores", amount: "₹9,100", status: "Paid", date: "07 Nov 2023" },
  ];

  const revenueData = [65, 59, 80, 81, 56, 55, 72, 68, 76, 85, 92, 88];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="h-[85vh] flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-bg border-b border-border p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text">Dashboard Overview</h1>
          <div className="flex items-center space-x-2 text-text/60">
            <span>Last updated: Today, 10:30 AM</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-surface rounded-xl p-6 shadow-md border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-text/60 text-sm">{stat.title}</p>
                    <p className="text-2xl font-bold text-text mt-1">{stat.value}</p>
                    <p className={`text-sm mt-2 flex items-center ${stat.color}`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-surface rounded-xl p-6 shadow-md border border-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-text">Revenue Overview</h2>
              <select className="px-3 py-2 border border-border rounded-lg text-sm">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
            </div>
            <div className="h-64">
              <div className="flex items-end justify-between h-48 mt-4">
                {revenueData.map((value, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg"
                      style={{ height: `${value}%` }}
                    />
                    <span className="text-xs text-text/60 mt-2">{months[index]}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-text/60 text-sm">Total Revenue</p>
                  <p className="text-xl font-bold text-text">₹1,25,480</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 text-sm flex items-center">
                    <HiTrendingUp className="w-4 h-4 mr-1" />
                    +12.5% from last month
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface rounded-xl p-6 shadow-md border border-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-text">Recent Invoices</h2>
              <button className="text-primary text-sm hover:text-primary/80">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentInvoices.map((invoice, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium text-text">{invoice.id}</p>
                    <p className="text-sm text-text/60">{invoice.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text">{invoice.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      invoice.status === "Paid" 
                        ? "bg-green-100 text-green-800" 
                        : invoice.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Quick Stats */}
          <div className="bg-surface rounded-xl p-6 shadow-md border border-border">
            <h2 className="text-lg font-semibold text-text mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text/60">Active Customers</span>
                <span className="font-medium text-text">248</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text/60">Pending Quotations</span>
                <span className="font-medium text-text">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text/60">Total Products</span>
                <span className="font-medium text-text">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text/60">Monthly Expenses</span>
                <span className="font-medium text-text">₹45,200</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-surface rounded-xl p-6 shadow-md border border-border lg:col-span-2">
            <h2 className="text-lg font-semibold text-text mb-4">Top Selling Products</h2>
            <div className="space-y-4">
              {[
                { name: "Wireless Headphones", sales: "₹42,800", growth: "+15%" },
                { name: "Smart Watch", sales: "₹38,500", growth: "+22%" },
                { name: "Laptop Bag", sales: "₹28,300", growth: "+8%" },
                { name: "Phone Case", sales: "₹19,200", growth: "+5%" },
                { name: "USB Cable", sales: "₹15,800", growth: "+12%" },
              ].map((product, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex-1">
                  <p className="font-medium text-text">{product.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full" 
                      style={{ width: `${70 - (index * 10)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium text-text">{product.sales}</p>
                  <p className="text-green-600 text-sm">{product.growth}</p>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-surface rounded-xl p-6 shadow-md border border-border">
          <h2 className="text-lg font-semibold text-text mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: "New invoice created", user: "You", time: "2 minutes ago" },
              { action: "Payment received", user: "Rajesh Kumar", time: "1 hour ago" },
              { action: "Quotation approved", user: "Meena Enterprises", time: "3 hours ago" },
              { action: "New customer added", user: "You", time: "5 hours ago" },
              { action: "Product stock updated", user: "Inventory Manager", time: "Yesterday" },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-text">{activity.action}</p>
                  <p className="text-sm text-text/60">by {activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}