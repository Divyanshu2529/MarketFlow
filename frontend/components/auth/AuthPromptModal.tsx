"use client";

import Link from "next/link";
import { LockKeyhole, X } from "lucide-react";

type AuthPromptModalProps = {
  open: boolean;
  feature: string;
  onClose: () => void;
};

export function AuthPromptModal({
  open,
  feature,
  onClose,
}: AuthPromptModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <LockKeyhole size={24} />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          MarketFlow
        </p>

        <h2
          id="auth-prompt-title"
          className="text-2xl font-bold text-card-foreground"
        >
          Sign in to continue
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Log in or create a free account to access{" "}
          {feature.toLowerCase()} and the rest of the
          MarketFlow workspace.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Link
            href="/login"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}