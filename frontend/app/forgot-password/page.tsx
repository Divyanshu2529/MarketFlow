"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      await requestPasswordReset(email);

      setMessage(
        "If an account exists with that email, a reset link has been sent."
      );
      setEmail("");
    } catch {
      setError("Unable to process your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Forgot your password?
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-green-950/50 p-3 text-sm text-green-400">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-purple-400 hover:text-purple-300"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}