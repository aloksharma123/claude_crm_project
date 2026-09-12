const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("crm_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  signup: (body) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  googleLogin: (credential) => request("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  verifyEmail: (token) => request("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  resendVerification: (email) => request("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),

  dashboard: () => request("/api/dashboard"),

  listContacts: () => request("/api/contacts"),
  getContact: (id) => request(`/api/contacts/${id}`),
  createContact: (body) => request("/api/contacts", { method: "POST", body: JSON.stringify(body) }),
  updateContact: (id, body) => request(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteContact: (id) => request(`/api/contacts/${id}`, { method: "DELETE" }),

  listCompanies: () => request("/api/companies"),
  createCompany: (body) => request("/api/companies", { method: "POST", body: JSON.stringify(body) }),
  deleteCompany: (id) => request(`/api/companies/${id}`, { method: "DELETE" }),

  listDeals: () => request("/api/deals"),
  createDeal: (body) => request("/api/deals", { method: "POST", body: JSON.stringify(body) }),
  updateDealStage: (id, stage) => request(`/api/deals/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) }),
  deleteDeal: (id) => request(`/api/deals/${id}`, { method: "DELETE" }),

  createActivity: (body) => request("/api/activities", { method: "POST", body: JSON.stringify(body) }),
  completeActivity: (id) => request(`/api/activities/${id}/complete`, { method: "PUT" }),

  listLeads: () => request("/api/leads"),
  createLead: (body) => request("/api/leads", { method: "POST", body: JSON.stringify(body) }),
  convertLead: (id, body) => request(`/api/leads/${id}/convert`, { method: "POST", body: JSON.stringify(body || {}) }),
  deleteLead: (id) => request(`/api/leads/${id}`, { method: "DELETE" }),

  listProducts: () => request("/api/products"),
  createProduct: (body) => request("/api/products", { method: "POST", body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),

  listCases: () => request("/api/cases"),
  createCase: (body) => request("/api/cases", { method: "POST", body: JSON.stringify(body) }),
  updateCaseStatus: (id, status) => request(`/api/cases/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getForecast: () => request("/api/forecast"),
};

export function saveSession(token, user) {
  localStorage.setItem("crm_token", token);
  localStorage.setItem("crm_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_user");
}

export function getSessionUser() {
  const raw = localStorage.getItem("crm_user");
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!getToken();
}
