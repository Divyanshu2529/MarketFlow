"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("This password reset link is invalid.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);

      setMessage(
        "Your password has been reset successfully. Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError(
        "This reset link is invalid or expired. Please request a new one."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Reset your password
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Create a new password for your MarketFlow account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              New password
            </label>

            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              placeholder="Repeat your password"
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
            {isLoading ? "Resetting..." : "Reset password"}
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