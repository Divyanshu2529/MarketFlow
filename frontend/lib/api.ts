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

export type WatchlistItem = {
  id: number;
  ticker: string;
  created_at: string;
};

export type NewsArticle = {
  title: string;
  publisher?: string | null;
  publishedDate?: string | null;
  url: string;
  image?: string | null;
  summary?: string | null;
};

export type Report = {
  id: number;
  ticker: string;
  company_name: string;
  title: string;
  report_type: string;
  report_data: Record<string, unknown>;
  created_at: string;
};

export type CreateReportData = {
  ticker: string;
  company_name: string;
  report_type?: string;
  report_data?: Record<string, unknown>;
};

export type ReportDownloadFormat =
  | "pdf"
  | "docx"
  | "json";

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

export const updateCurrentUser = async (
  name: string
): Promise<User> => {
  const response = await api.patch<User>(
    "/api/auth/me",
    { name }
  );

  return response.data;
};

export const updateCurrentUserEmail = async (
  email: string,
  currentPassword: string
): Promise<User> => {
  const response = await api.patch<User>(
    "/api/auth/me/email",
    {
      email,
      current_password: currentPassword,
    }
  );

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

export const getWatchlist = async (): Promise<
  WatchlistItem[]
> => {
  const response = await api.get<WatchlistItem[]>(
    "/api/watchlist"
  );

  return response.data;
};

export const addToWatchlist = async (
  ticker: string
): Promise<WatchlistItem> => {
  const response = await api.post<WatchlistItem>(
    "/api/watchlist",
    { ticker }
  );

  return response.data;
};

export const removeFromWatchlist = async (
  ticker: string
) => {
  const response = await api.delete(
    `/api/watchlist/${ticker}`
  );

  return response.data;
};

export const recordSearchInterest = async (
  ticker: string,
  companyName: string
): Promise<void> => {
  await api.post("/api/news/interests", {
    ticker,
    company_name: companyName,
  });
};

export const getNewsFeed = async (): Promise<
  NewsArticle[]
> => {
  const response = await api.get<{
    articles: NewsArticle[];
  }>("/api/news/feed");

  return response.data.articles ?? [];
};

export const getReports = async (): Promise<Report[]> => {
  const response = await api.get<Report[]>("/api/reports");

  return response.data;
};

export const getReport = async (
  reportId: number
): Promise<Report> => {
  const response = await api.get<Report>(
    `/api/reports/${reportId}`
  );

  return response.data;
};

export const createReport = async (
  data: CreateReportData
): Promise<Report> => {
  const response = await api.post<Report>("/api/reports", {
    ticker: data.ticker,
    company_name: data.company_name,
    report_type: data.report_type ?? "Equity Research",
    report_data: data.report_data ?? {},
  });

  return response.data;
};

export const deleteReport = async (
  reportId: number
) => {
  const response = await api.delete(
    `/api/reports/${reportId}`
  );

  return response.data;
};

export const downloadReport = async (
  reportId: number,
  format: ReportDownloadFormat
): Promise<void> => {
  const response = await api.get<Blob>(
    `/api/reports/${reportId}/download`,
    {
      params: {
        format,
      },
      responseType: "blob",
    }
  );

  const contentDisposition =
    response.headers["content-disposition"];

  const filenameMatch =
    contentDisposition?.match(
      /filename="([^"]+)"/
    );

  const filename =
    filenameMatch?.[1] ??
    `research-report-${reportId}.${format}`;

  const fileUrl = window.URL.createObjectURL(
    response.data
  );

  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(fileUrl);
  }, 1000);
};