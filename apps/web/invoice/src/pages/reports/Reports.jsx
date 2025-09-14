// src/pages/reports/ReportsPage.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { FiDownload, FiRefreshCw, FiSearch, FiCalendar, FiFilter, FiX, FiChevronDown } from "react-icons/fi";
import { toast } from "react-hot-toast";
import ProfitLossPanel from "./ProfitLossPanel";
import SalesPanel from "./SalesPanel";
import TaxPanel from "./TaxPanel";
import TopListsPanel from "./TopListsPanel";
import { exportReportCsv, fetchInvoicePL, searchInvoices } from "./ReportsApi";

const datePresets = {
    "Last 7 Days": () => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 6);
        return { from, to };
    },
    "Last 30 Days": () => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 29);
        return { from, to };
    },
    "Last 90 Days": () => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 89);
        return { from, to };
    },
    "This Month": () => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth(), 1);
        return { from, to };
    },
};

function formatDateInput(d) {
    if (!d) return "";
    if (typeof d === "string") return d.slice(0, 10);
    return new Date(d).toISOString().slice(0, 10);
}

export default function ReportsPage() {
    // Filter inputs (editable)
    const [fromInput, setFromInput] = useState("");
    const [toInput, setToInput] = useState("");
    const [groupByInput, setGroupByInput] = useState("month");
    const [customerInput, setCustomerInput] = useState("");
    const [statusInput, setStatusInput] = useState("");

    // Committed params (applied)
    const [appliedFrom, setAppliedFrom] = useState("");
    const [appliedTo, setAppliedTo] = useState("");
    const [appliedGroupBy, setAppliedGroupBy] = useState("month");
    const [appliedCustomer, setAppliedCustomer] = useState("");
    const [appliedStatus, setAppliedStatus] = useState("");

    // UI states
    const [showFilters, setShowFilters] = useState(false);
    const [showDatePresets, setShowDatePresets] = useState(false);

    // refreshKey to force remount if panels fetch on mount only
    const [refreshKey, setRefreshKey] = useState(0);

    // invoice autocomplete state
    const [invoiceQuery, setInvoiceQuery] = useState("");
    const [invoiceSuggestions, setInvoiceSuggestions] = useState([]);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoicePL, setInvoicePL] = useState(null);
    const invoiceTimer = useRef(null);
    const invoiceBoxRef = useRef(null);
    const datePresetRef = useRef(null);

    const params = useMemo(
        () => ({
            from: appliedFrom || undefined,
            to: appliedTo || undefined,
            groupBy: appliedGroupBy || undefined,
            customer: appliedCustomer || undefined,
            status: appliedStatus || undefined,
        }),
        [appliedFrom, appliedTo, appliedGroupBy, appliedCustomer, appliedStatus]
    );

    useEffect(() => {
        function onClick(e) {
            if (!invoiceBoxRef.current) return;
            if (!invoiceBoxRef.current.contains(e.target)) {
                setInvoiceSuggestions([]);
            }

            if (datePresetRef.current && !datePresetRef.current.contains(e.target)) {
                setShowDatePresets(false);
            }
        }
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);

    // invoice search debounce
    useEffect(() => {
        if (!invoiceQuery || invoiceQuery.trim().length < 2) {
            setInvoiceSuggestions([]);
            return;
        }
        if (invoiceTimer.current) clearTimeout(invoiceTimer.current);
        invoiceTimer.current = setTimeout(async () => {
            setInvoiceLoading(true);
            try {
                const res = await searchInvoices(invoiceQuery.trim());
                // make sure the API returns array; fall back to []
                const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
                setInvoiceSuggestions(items || []);
            } catch (err) {
                console.error("Invoice search failed", err);
                setInvoiceSuggestions([]);
            } finally {
                setInvoiceLoading(false);
            }
        }, 300);
        return () => {
            if (invoiceTimer.current) clearTimeout(invoiceTimer.current);
        };
    }, [invoiceQuery]);

    const applyFilters = () => {
        setAppliedFrom(fromInput || "");
        setAppliedTo(toInput || "");
        setAppliedGroupBy(groupByInput || "month");
        setAppliedCustomer(customerInput || "");
        setAppliedStatus(statusInput || "");
        setRefreshKey((k) => k + 1);
        setShowFilters(false);
        toast.success("Filters applied");
    };

    const clearFilters = () => {
        setFromInput("");
        setToInput("");
        setGroupByInput("month");
        setCustomerInput("");
        setStatusInput("");
        setAppliedFrom("");
        setAppliedTo("");
        setAppliedGroupBy("month");
        setAppliedCustomer("");
        setAppliedStatus("");
        setRefreshKey((k) => k + 1);
        toast.success("Filters cleared");
    };

    const applyPreset = (presetName) => {
        const preset = datePresets[presetName];
        if (!preset) return;
        const { from, to } = preset();
        setFromInput(formatDateInput(from));
        setToInput(formatDateInput(to));
        setShowDatePresets(false);
    };

    const handleExport = async (report) => {
        try {
            toast.loading("Preparing CSV...", { id: "export" });
            const opts = {
                report,
                format: "csv",
                from: appliedFrom || undefined,
                to: appliedTo || undefined,
                customer: appliedCustomer || undefined,
                status: appliedStatus || undefined,
                groupBy: appliedGroupBy || undefined,
            };
            const res = await exportReportCsv(opts);
            // we expect responseType 'blob' or CSV text
            const data = res.data;
            const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${report}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("CSV downloaded", { id: "export" });
        } catch (err) {
            console.error("Export failed", err);
            toast.error("Failed to export CSV", { id: "export" });
        }
    };

    // Fetch invoice PL when an invoice is selected
    const loadInvoicePL = async (invoiceId) => {
        if (!invoiceId) return;
        try {
            const res = await fetchInvoicePL(invoiceId);
            // expect res.data.data shape from backend - adapt if different
            const payload = res?.data?.data || res?.data || null;
            setInvoicePL(payload);
        } catch (err) {
            console.error("Failed to fetch invoice P/L", err);
            toast.error("Failed to load invoice profit/loss");
            setInvoicePL(null);
        }
    };

    return (
        <div className="">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Reports Dashboard</h1>
                        <p className="text-sm text-gray-600 mt-1">Sales, tax, profit & loss and operational reports</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="flex gap-2">
                            <div className="relative" ref={datePresetRef}>
                                <button
                                    onClick={() => setShowDatePresets(!showDatePresets)}
                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <FiCalendar className="text-gray-500" />
                                    Date Presets
                                    <FiChevronDown className="text-gray-400" />
                                </button>

                                {showDatePresets && (
                                    <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                        {Object.keys(datePresets).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => applyPreset(p)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                            >
                                <FiFilter className="text-gray-500" />
                                Filters
                            </button>

                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                            >
                                <FiRefreshCw className="text-gray-500" />
                                Clear
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExport("sales")}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                                title="Export Sales CSV"
                            >
                                <FiDownload className="text-sm" />
                                <span className="hidden sm:inline">Sales CSV</span>
                            </button>
                            <button
                                onClick={() => handleExport("tax")}
                                className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-gray-900 transition-colors"
                                title="Export Tax CSV"
                            >
                                <FiDownload className="text-sm" />
                                <span className="hidden sm:inline">Tax CSV</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-800">Filter Reports</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                                <input
                                    type="date"
                                    value={fromInput}
                                    onChange={(e) => setFromInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={toInput}
                                    onChange={(e) => setToInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                                <select
                                    value={groupByInput}
                                    onChange={(e) => setGroupByInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="day">Day</option>
                                    <option value="month">Month</option>
                                    <option value="year">Year</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <input
                                    placeholder="Name or ID"
                                    value={customerInput}
                                    onChange={(e) => setCustomerInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="unpaid">Unpaid</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4 gap-2">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Filters Indicator */}
                {(appliedFrom || appliedTo || appliedCustomer || appliedStatus) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center flex-wrap gap-2">
                        <span className="text-sm font-medium text-blue-800">Active Filters:</span>

                        {appliedFrom && appliedTo && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Date: {new Date(appliedFrom).toLocaleDateString()} - {new Date(appliedTo).toLocaleDateString()}
                            </span>
                        )}

                        {appliedCustomer && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Customer: {appliedCustomer}
                            </span>
                        )}

                        {appliedStatus && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Status: {appliedStatus}
                            </span>
                        )}

                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            Clear all
                            <FiX size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Invoice dropdown for per-invoice PL */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div ref={invoiceBoxRef} className="relative flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check Invoice Profit/Loss</label>
                        <div className="flex rounded-lg shadow-sm">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    value={invoiceQuery}
                                    onChange={(e) => {
                                        setInvoiceQuery(e.target.value);
                                        setSelectedInvoice(null);
                                        setInvoicePL(null);
                                    }}
                                    placeholder="Search by invoice number or customer name..."
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (selectedInvoice) loadInvoicePL(selectedInvoice._id);
                                    else if (invoiceQuery && invoiceSuggestions.length === 1) {
                                        setSelectedInvoice(invoiceSuggestions[0]);
                                        loadInvoicePL(invoiceSuggestions[0]._id);
                                    }
                                }}
                                disabled={invoiceLoading}
                                className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-r-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {invoiceLoading ? "Loading..." : "Get P/L"}
                            </button>
                        </div>

                        {/* suggestions */}
                        {invoiceSuggestions && invoiceSuggestions.length > 0 && (
                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {invoiceSuggestions.map((inv) => (
                                    <button
                                        type="button"
                                        key={inv._id}
                                        onClick={() => {
                                            setSelectedInvoice(inv);
                                            setInvoiceQuery(inv.invoiceNo || inv._id);
                                            setInvoiceSuggestions([]);
                                            setInvoicePL(null);
                                            loadInvoicePL(inv._id);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900">{inv.invoiceNo || inv._id}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {inv.customer?.name ? `${inv.customer.name} • ${inv.invoiceDate?.slice(0, 10) ?? ""}` : inv.invoiceDate?.slice(0, 10)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setInvoiceQuery("");
                                setInvoiceSuggestions([]);
                                setSelectedInvoice(null);
                                setInvoicePL(null);
                            }}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* show result */}
                {invoicePL ? (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-3">Invoice Profit/Loss Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm text-gray-500">Invoice</div>
                                <div className="font-semibold text-gray-900">{invoicePL.invoiceId || selectedInvoice?.invoiceNo || "-"}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm text-gray-500">Revenue</div>
                                <div className="font-semibold text-green-600">₹{invoicePL.revenue ?? 0}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm text-gray-500">Purchases</div>
                                <div className="font-semibold text-red-600">₹{invoicePL.totalPurchase ?? invoicePL.purchaseCost ?? 0}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm text-gray-500">Expenses</div>
                                <div className="font-semibold text-red-600">₹{invoicePL.totalExpense ?? invoicePL.directExpenses ?? 0}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm text-gray-500">Gross Profit</div>
                                <div className="font-semibold text-blue-600">₹{invoicePL.grossProfit ?? (invoicePL.revenue - (invoicePL.totalPurchase ?? 0))}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm bg-blue-50">
                                <div className="text-sm text-blue-700">Net Profit</div>
                                <div className="font-semibold text-blue-800">₹{invoicePL.profit ?? invoicePL.netProfit ?? 0}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 text-sm text-gray-500 flex items-center">
                        <FiSearch className="mr-2" />
                        Search and select an invoice to view profit/loss details.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Top Row: ProfitLoss (60%) + Tax (40%) */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3">
                        <ProfitLossPanel key={`profit-${refreshKey}`} params={params} refreshKey={refreshKey} />
                    </div>
                    <div className="xl:col-span-2">
                        <TaxPanel key={`tax-${refreshKey}`} params={params} refreshKey={refreshKey} />
                    </div>
                </div>

                {/* Full Width Sales Panel */}
                <div>
                    <SalesPanel key={`sales-${refreshKey}`} params={params} refreshKey={refreshKey} />
                </div>
            </div>

        </div>
    );
}