let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
  }
  return "/api";
};

const getServerBase = (): string => {
  const apiUrl = getBaseUrl();
  return apiUrl.replace(/\/api\/?$/, "");
};

export const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const serverBase = getServerBase();
  return `${serverBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

const request = async (path: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw payload || new Error("Yêu cầu thất bại. Vui lòng thử lại.");
  }
  return payload;
};

export const apiService = {
  get: (path: string, options?: RequestInit) => {
    const sep = path.includes("?") ? "&" : "?";
    return request(`${path}${sep}_t=${Date.now()}`, { ...options, method: "GET" });
  },
  post: (path: string, body: unknown, options?: RequestInit) =>
    request(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown, options?: RequestInit) =>
    request(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string, options?: RequestInit) =>
    request(path, { ...options, method: "DELETE" }),
};

export const formatVND = (amount: number): string => {
  const rounded = Math.round(amount);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}₫`;
};

export const estimateDeliveryFee = (address: string): number => {
  const normalized = address
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const areas = [
    { keywords: ["quan 1", "q1", "q.1"], fee: 15000 },
    { keywords: ["quan 3", "q3", "q.3"], fee: 18000 },
    { keywords: ["binh thanh"], fee: 22000 },
  ];
  const area = areas.find((a) => a.keywords.some((k) => normalized.includes(k)));
  return area ? area.fee : 0;
};