// src/axiosInstance.js
import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL, // keep your env name
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || "";

    // refresh token once on 401
    if (status === 401 && !error.config.__retried) {
      error.config.__retried = true;
      const u = auth.currentUser;
      if (u) {
        const fresh = await u.getIdToken(true);
        error.config.headers.Authorization = `Bearer ${fresh}`;
        return api.request(error.config);
      }
    }

    // onboarding guard
    if (
      status === 403 &&
      (msg.includes("not registered") ||
        msg.includes("not linked to any company"))
    ) {
      if (!window.location.pathname.startsWith("/company")) {
        window.location.assign("/company");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
