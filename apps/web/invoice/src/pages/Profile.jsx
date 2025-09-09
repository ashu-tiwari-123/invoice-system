import { useState } from "react";
import { useUser } from "../context/userContext";
import { HiUser, HiMail, HiPhone, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import {formatDateTime} from "../utils/FormatUtilities";
import Loading from "../utils/Loading";

export default function Profile() {
  const { user, updateProfile } = useUser(); 
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await updateProfile({ displayName, phoneNumber });
      setMessage({ text: "Profile updated successfully", type: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to update profile", type: "error" });
    }

    setLoading(false);
  };

  if (!user) {
    return (
     <Loading/>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-surface p-6 rounded-lg shadow-md border border-border">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-3">
          <HiUser className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-text">My Profile</h2>
        <p className="text-text/60 mt-1">Manage your account information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email (readonly) */}
        <div>
          <label className=" text-sm font-medium text-text mb-2 flex items-center">
            <HiMail className="w-4 h-4 mr-2" />
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 border border-border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-text/50 mt-1">Email cannot be changed</p>
        </div>

        {/* Display Name */}
        <div>
          <label className=" text-sm font-medium text-text mb-2 flex items-center">
            <HiUser className="w-4 h-4 mr-2" />
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className=" text-sm font-medium text-text mb-2 flex items-center">
            <HiPhone className="w-4 h-4 mr-2" />
            Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (!displayName && !phoneNumber)}
          className="w-full bg-gradient-to-r from-primary to-primary/90 text-white py-3 rounded-lg font-medium hover:from-primary/90 hover:to-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Updating...
            </>
          ) : (
            "Update Profile"
          )}
        </button>
      </form>

      {/* Message Alert */}
      {message.text && (
        <div className={`mt-6 p-4 rounded-lg border ${message.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
          } flex items-start`}>
          {message.type === "success" ? (
            <HiCheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          ) : (
            <HiExclamationCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Account Info */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="font-medium text-text mb-3">Account Information</h3>
        <div className="space-y-2 text-sm text-text/60">
          <p>Last login: {formatDateTime(user?.lastLogin)}</p>
          <p>Account created: {formatDateTime(user?.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}