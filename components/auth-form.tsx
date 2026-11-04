"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const payload = isSignup
      ? {
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password"),
        }
      : {
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        };

    if (isSignup) {
        const displayName = String(payload.displayName ?? "").trim();
        const password = String(payload.password ?? "");
        if (!/^[a-zA-Z0-9 _-]+$/.test(displayName)) {
          setMessage("Display name can only use letters, numbers, spaces, hyphens, and underscores.");
          setPending(false);
          return;
        }
        if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setMessage("Password must be 8-72 characters and include a letter and a number.");
          setPending(false);
          return;
        }
    }

    if (isSignup && formData.get("password") !== formData.get("confirmPassword")) {
      setMessage("Passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign you in.");
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete your request.");
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
        <Link
          className={`auth-mode-button${!isSignup ? " active" : ""}`}
          href="/login"
          aria-current={!isSignup ? "page" : undefined}
        >
          Sign in
        </Link>
        <Link
          className={`auth-mode-button${isSignup ? " active" : ""}`}
          href="/signup"
          aria-current={isSignup ? "page" : undefined}
        >
          Create account
        </Link>
      </div>
      <div className="auth-card-heading">
        <span className="panel-kicker">{isSignup ? "New player" : "Player account"}</span>
        <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p>{isSignup ? "Choose a name your opponents will remember." : "Sign in with your arena name or email."}</p>
      </div>
      <form onSubmit={submit}>
        {isSignup ? (
          <>
            <div className="form-group">
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                name="displayName"
                autoComplete="nickname"
                autoCapitalize="none"
                spellCheck={false}
                minLength={2}
                maxLength={24}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="identifier">Username or email</label>
            <input id="identifier" name="identifier" autoComplete="username" required />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrap">
            <input
              id="password"
              name="password"
              type={visiblePasswords ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              maxLength={isSignup ? 72 : undefined}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setVisiblePasswords((visible) => !visible)}
            >
              {visiblePasswords ? "Hide" : "Show"}
            </button>
          </div>
          {isSignup && (
            <p className="auth-field-hint">Use 8-72 characters with at least one letter and one number.</p>
          )}
        </div>
        {isSignup && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={visiblePasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        )}
        <p className="auth-message error" role="alert" aria-live="polite">
          {message}
        </p>
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Working..." : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="auth-link">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create one"}</Link>
      </p>
    </div>
  );
}