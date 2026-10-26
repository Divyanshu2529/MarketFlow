"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getCurrentUser,
  logout,
  updateCurrentUser,
  updateCurrentUserEmail,
} from "@/lib/api";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark"
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [theme, setTheme] = useState<Theme>("light");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem(
      "marketflow-theme"
    ) as Theme | null;

    const selectedTheme =
      savedTheme === "dark" ? "dark" : "light";

    setTheme(selectedTheme);
    applyTheme(selectedTheme);

    async function loadUser() {
      try {
        const user = await getCurrentUser();

        setName(user.name);
        setEmail(user.email);
      } catch {
        setError("Unable to load your account information.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, []);

  function handleThemeChange(selectedTheme: Theme) {
    setTheme(selectedTheme);

    localStorage.setItem(
      "marketflow-theme",
      selectedTheme
    );

    applyTheme(selectedTheme);
  }

  async function handleSaveName(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }

    setError("");
    setMessage("");
    setIsSavingName(true);

    try {
      const updatedUser = await updateCurrentUser(
        trimmedName
      );

      setName(updatedUser.name);
      setMessage("Name updated successfully.");
    } catch {
      setError("Unable to update your name.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSaveEmail(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Email cannot be empty.");
      return;
    }

    if (!currentPassword) {
      setError(
        "Enter your current password to change your email."
      );
      return;
    }

    setError("");
    setMessage("");
    setIsSavingEmail(true);

    try {
      const updatedUser = await updateCurrentUserEmail(
        trimmedEmail,
        currentPassword
      );

      setEmail(updatedUser.email);
      setCurrentPassword("");
      setMessage("Email updated successfully.");
    } catch {
      setError(
        "Unable to update your email. Check your password or use another email."
      );
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await logout();

      router.push("/login");
      router.refresh();
    } catch {
      setError("Unable to log out.");
      setIsLoggingOut(false);
    }
  }

  const isDark = theme === "dark";

  const surfaceClass = isDark
    ? "border-slate-700 bg-slate-900"
    : "border-slate-200 bg-white";

  const inputClass = isDark
    ? "border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400";

  const labelClass = isDark
    ? "text-slate-300"
    : "text-slate-700";

  const secondaryTextClass = isDark
    ? "text-slate-400"
    : "text-slate-500";

  return (
    <DashboardLayout
      assistantContext={{
        currentPage: "/settings",
        pageTitle: "Account Settings",
        section: "Account and Security Settings",

        accountLoaded: !isLoading,

        account: {
          name,
          email,
        },

        currentTheme: theme,

        availableSections: [
          "Profile",
          "Email address",
          "Password reset",
          "Appearance",
          "Account logout",
        ],

        availableActions: [
          "Update name",
          "Change email",
          "Reset password",
          "Change light or dark mode",
          "Log out",
        ],

        assistantInstructions:
          "Explain the account and security options shown on this page. Never request, display, or store the user's current password. Do not expose sensitive authentication information.",
      }}
    >
      <div
        className={`mx-auto min-h-screen max-w-3xl space-y-8 p-1 ${
          isDark ? "text-white" : "text-slate-900"
        }`}
      >
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>

          <p className={`mt-2 ${secondaryTextClass}`}>
            Manage your MarketFlow account.
          </p>
        </div>

        {error && (
          <p
            className={`rounded-lg p-3 text-sm ${
              isDark
                ? "bg-red-950 text-red-300"
                : "bg-red-50 text-red-600"
            }`}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            className={`rounded-lg p-3 text-sm ${
              isDark
                ? "bg-green-950 text-green-300"
                : "bg-green-50 text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        {isLoading ? (
          <div
            className={`rounded-2xl border p-8 text-center ${surfaceClass} ${secondaryTextClass}`}
          >
            Loading your settings...
          </div>
        ) : (
          <>
            <section
              className={`rounded-2xl border p-6 shadow-sm ${surfaceClass}`}
            >
              <h2 className="text-xl font-semibold">
                Profile
              </h2>

              <form
                onSubmit={handleSaveName}
                className="mt-5 space-y-5"
              >
                <div>
                  <label
                    htmlFor="name"
                    className={`mb-2 block text-sm font-medium ${labelClass}`}
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    required
                    maxLength={100}
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${inputClass}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingName}
                  className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingName ? "Saving..." : "Save name"}
                </button>
              </form>
            </section>

            <section
              className={`rounded-2xl border p-6 shadow-sm ${surfaceClass}`}
            >
              <h2 className="text-xl font-semibold">
                Email address
              </h2>

              <p className={`mt-2 text-sm ${secondaryTextClass}`}>
                Enter your current password to change your email.
              </p>

              <form
                onSubmit={handleSaveEmail}
                className="mt-5 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className={`mb-2 block text-sm font-medium ${labelClass}`}
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${inputClass}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="current-password"
                    className={`mb-2 block text-sm font-medium ${labelClass}`}
                  >
                    Current password
                  </label>

                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    required
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${inputClass}`}
                    placeholder="Enter current password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingEmail}
                  className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEmail
                    ? "Updating..."
                    : "Update email"}
                </button>
              </form>
            </section>

            <section
              className={`rounded-2xl border p-6 shadow-sm ${surfaceClass}`}
            >
              <h2 className="text-xl font-semibold">
                Security
              </h2>

              <p className={`mt-2 text-sm ${secondaryTextClass}`}>
                Reset your password or manage your login security.
              </p>

              <Link
                href="/forgot-password"
                className="mt-5 inline-block rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-700"
              >
                Reset password
              </Link>
            </section>

            <section
              className={`rounded-2xl border p-6 shadow-sm ${surfaceClass}`}
            >
              <h2 className="text-xl font-semibold">
                Appearance
              </h2>

              <p className={`mt-2 text-sm ${secondaryTextClass}`}>
                Choose how MarketFlow looks on this device.
              </p>

              <select
                value={theme}
                onChange={(event) =>
                  handleThemeChange(
                    event.target.value as Theme
                  )
                }
                className={`mt-5 rounded-lg border px-3 py-2 outline-none focus:border-purple-500 ${inputClass}`}
              >
                <option value="light">Light mode</option>
                <option value="dark">Dark mode</option>
              </select>
            </section>

            <section
              className={`rounded-2xl border p-6 shadow-sm ${
                isDark
                  ? "border-red-900 bg-slate-900"
                  : "border-red-200 bg-white"
              }`}
            >
              <h2 className="text-xl font-semibold">
                Account
              </h2>

              <p className={`mt-2 text-sm ${secondaryTextClass}`}>
                Sign out of your MarketFlow account.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-5 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}