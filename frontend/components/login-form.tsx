"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/error-notice";
import { ApiError } from "@/lib/api";
import { signIn, signUp, storeSession } from "@/lib/auth";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heading = mode === "signin" ? "Sign in" : "Create your account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const request = mode === "signin" ? signIn : signUp;
      const session = await request({
        email,
        password,
        ...(mode === "signup" && name ? { name } : {}),
      });
      storeSession(session);
      router.push("/documents/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists — try signing in.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-gray-text/25 border-t-4 border-t-accent-yellow bg-white p-8 shadow-sm"
    >
      <h1 className="mb-6 text-xl font-semibold text-navy">{heading}</h1>

      {mode === "signup" && (
        <label className="mb-4 block text-sm font-medium text-navy">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="mt-1.5 block w-full rounded-md border border-gray-text/40 px-3 py-2 text-base text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary"
          />
        </label>
      )}

      <label className="mb-4 block text-sm font-medium text-navy">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="mt-1.5 block w-full rounded-md border border-gray-text/40 px-3 py-2 text-base text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary"
        />
      </label>

      <label className="mb-6 block text-sm font-medium text-navy">
        Password
        <input
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="mt-1.5 block w-full rounded-md border border-gray-text/40 px-3 py-2 text-base text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary"
        />
      </label>

      {error && <ErrorNotice message={error} className="mb-4" />}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-purple-secondary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary"
      >
        {submitting ? "Please wait…" : heading}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full text-center text-sm text-blue-primary hover:underline"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
