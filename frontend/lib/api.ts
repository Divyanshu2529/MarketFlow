import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const searchCompanies = async (query: string) => {
  const response = await api.get("/api/company/search", {
    params: { q: query },
  });

  return response.data;
};