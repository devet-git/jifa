const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 from these paths means an upstream credential failed (e.g. revoked
// GitLab PAT) — must not log the Jifa user out.
const UPSTREAM_PATH_FRAGMENTS = ["/integrations/", "/external-refs"];

function isUpstreamRequest(url: string | undefined): boolean {
  if (!url) return false;
  return UPSTREAM_PATH_FRAGMENTS.some((frag) => url.includes(frag));
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url: string | undefined = err.config?.url;
    const hasUpstreamFlag = !!err.response?.data?.upstream_op;

    const isJifaAuthFailure =
      status === 401 && !hasUpstreamFlag && !isUpstreamRequest(url);

    if (
      isJifaAuthFailure &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("jifa-appearance");
      window.location.href = `${basePath}/login`;
    }
    return Promise.reject(err);
  }
);

export default api;
