import { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";
import {
    HiBuildingOffice,
    HiPhone,
    HiEnvelope,
    HiBanknotes,
    HiMapPin,
    HiIdentification,
    HiCreditCard,
    HiDocumentText
} from "react-icons/hi2";
import toast from "react-hot-toast";
import Loading from "../../utils/Loading";

export default function UpdateCompany() {
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch company profile on load
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await axiosInstance.get("/company");
                setCompany(res.data.data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load company data");
            }
        };
        fetchCompany();
    }, []);

    // Handle form changes
    const handleChange = (e) => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    // Submit create/update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await axiosInstance.post("/company", company);
            setCompany(res.data.data);
            toast.success("Company profile updated successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update company profile");
        }

        setSaving(false);
    };

    if (!company) {
        return (
            <Loading/>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
            <div className="bg-surface rounded-xl shadow-md border border-border p-6">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <HiBuildingOffice className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-text">Company Profile</h2>
                    <p className="text-text/60 mt-2">Manage your company details and information</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information - 3 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiBuildingOffice className="w-4 h-4 mr-2" />
                                Company Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={company.name || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                required
                                placeholder="Enter company name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiDocumentText className="w-4 h-4 mr-2" />
                                State Code
                            </label>
                            <input
                                type="text"
                                name="stateCode"
                                value={company.stateCode || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="e.g., 27"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiIdentification className="w-4 h-4 mr-2" />
                                GSTIN *
                            </label>
                            <input
                                type="text"
                                name="gstin"
                                value={company.gstin || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                required
                                placeholder="e.g., 27ABCDE1234F1Z5"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiCreditCard className="w-4 h-4 mr-2" />
                                PAN Number
                            </label>
                            <input
                                type="text"
                                name="pan"
                                value={company.pan || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="e.g., ABCDE1234F"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">
                                State
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={company.state || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="e.g., Maharashtra"
                            />
                        </div>
                    </div>

                    {/* Address Information - 2 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiMapPin className="w-4 h-4 mr-2" />
                                Full Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={company.address || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="Enter complete address"
                            />
                        </div>
                    </div>

                    {/* Contact Information - 3 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiPhone className="w-4 h-4 mr-2" />
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={company.phone || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="+91 1234567890"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiEnvelope className="w-4 h-4 mr-2" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={company.email || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="company@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2 flex items-center">
                                <HiBanknotes className="w-4 h-4 mr-2" />
                                Bank Name
                            </label>
                            <input
                                type="text"
                                name="bankName"
                                value={company.bankName || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="Bank name"
                            />
                        </div>
                    </div>

                    {/* Bank Information - 4 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text mb-2">
                                Account Number
                            </label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={company.accountNumber || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="Account number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">
                                IFSC Code
                            </label>
                            <input
                                type="text"
                                name="ifsc"
                                value={company.ifsc || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="e.g., SBIN0000123"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-2">
                                Branch
                            </label>
                            <input
                                type="text"
                                name="branch"
                                value={company.branch || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                placeholder="Branch name"
                            />
                        </div>

                        {/* <div>
              <label className="block text-sm font-medium text-text mb-2">
                Account Type
              </label>
              <select
                name="accountType"
                value={company.accountType || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              >
                <option value="">Select type</option>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="od">Overdraft</option>
              </select>
            </div> */}
                    </div>

                    {/* Additional Fields - 2 columns
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={company.website || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Business Type
              </label>
              <select
                name="businessType"
                value={company.businessType || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              >
                <option value="">Select business type</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="llp">LLP</option>
                <option value="pvt-ltd">Private Limited</option>
                <option value="ltd">Public Limited</option>
              </select>
            </div>
          </div> */}

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-primary to-primary/90 text-white py-3 rounded-lg font-medium hover:from-primary/90 hover:to-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                    Saving Changes...
                                </>
                            ) : (
                                "Save Company Details"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}