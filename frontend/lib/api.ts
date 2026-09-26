import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export type User = {
  id: number;
  name: string;
  email: string;
};

export type SignupData = {
  name: string;
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export const searchCompanies = async (query: string) => {
  const response = await api.get("/api/company/search", {
    params: { q: query },
  });

  return response.data;
};

export const signup = async (
  data: SignupData
): Promise<User> => {
  const response = await api.post<User>(
    "/api/auth/signup",
    data
  );

  return response.data;
};

export const login = async (
  data: LoginData
): Promise<User> => {
  const response = await api.post<User>(
    "/api/auth/login",
    data
  );

  return response.data;
};

export const logout = async () => {
  const response = await api.post("/api/auth/logout");

  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>("/api/auth/me");

  return response.data;
};
export const requestPasswordReset = async (
  email: string
) => {
  const response = await api.post(
    "/api/auth/forgot-password",
    { email }
  );

  return response.data;
};

export const resetPassword = async (
  token: string,
  newPassword: string
) => {
  const response = await api.post(
    "/api/auth/reset-password",
    {
      token,
      new_password: newPassword,
    }
  );

  return response.data;
};