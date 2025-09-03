import axios from "axios";
import { auth } from "./firebase";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL, // your backend URL
});

axiosInstance.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
