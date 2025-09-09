import { useState } from "react";
import { useUser } from "../context/userContext.jsx";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiMail, HiEye, HiEyeOff } from "react-icons/hi";
import { FaLock } from "react-icons/fa";
import { BsShieldFillExclamation } from "react-icons/bs";

export default function Login() {
  const { login } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password");
      toast.error("Login failed. Please check your credentials.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg p-4">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-lg border border-border p-6 md:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaLock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-text">Welcome Back</h2>
          <p className="text-text/60 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className=" text-sm font-medium text-text mb-2 flex items-center">
              <HiMail className="w-4 h-4 mr-2" />
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className=" text-sm font-medium text-text mb-2 flex items-center">
              <FaLock className="w-4 h-4 mr-2" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/40 hover:text-text/60"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <HiEyeOff className="w-5 h-5" />
                ) : (
                  <HiEye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary/90 text-white py-3 rounded-lg font-medium hover:from-primary/90 hover:to-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-text/60 hover:text-text text-sm"
            onClick={() =>
              toast.custom((t) => (
                <div
                  className={`${t.visible ? "animate-enter" : "animate-leave"
                    } max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      < BsShieldFillExclamation className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Password Reset
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Please contact support to reset your password.
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <span className="sr-only">Close</span>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </div>
  );
}