import { config } from "dotenv";
config({ path: "./.env" });
const BASE_URL = process.env.FRONTEND_URL;

const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr).token || null;
  } catch {
    return null;
  }
};

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("user");
      window.location.href = "/login"; // adjust to your actual login route
    }
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}
