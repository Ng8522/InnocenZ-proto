import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PhoneFrame } from "@/components/Brand";
import { ArrowLeft, Mail, User, Lock } from "lucide-react";

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "create" ? "create" : "signin") as "signin" | "create",
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const role = useStore((s) => s.role);
  const signIn = useStore((s) => s.signIn);
  const [name, setName] = useState(mode === "create" ? "" : "Alex Tan");
  const [email, setEmail] = useState(mode === "create" ? "" : "alex@innocenz.app");
  const [password, setPassword] = useState("password");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signIn(name || email.split("@")[0], email);
    const path =
      role === "vendor" ? "/outlet"
      : role === "host" ? "/host"
      : role === "agency" ? "/agency"
      : "/host";
    navigate({ to: path });
  };

  return (
    <PhoneFrame>
      <div className="iz-welcome flex flex-1 flex-col">
        <button type="button" onClick={() => navigate({ to: "/" })} className="iz-chip w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="iz-logo-tile mt-8">
          <span>Z</span>
        </div>

        <h1 className="font-sora mt-6 text-2xl font-extrabold text-[var(--iz-txt)]">
          {mode === "create" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="iz-sm iz-muted mt-1">
          {mode === "create" ? "Join the InnocenZ network." : "Sign in to continue."}
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          {mode === "create" && (
            <label className="iz-field">
              <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
                <User className="h-4 w-4 text-[var(--iz-muted)]" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
          )}
          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <Mail className="h-4 w-4 text-[var(--iz-muted)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <Lock className="h-4 w-4 text-[var(--iz-muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>

          <button type="submit" className="iz-btn iz-btn-primary mt-4">
            {mode === "create" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate({ to: "/signin", search: { mode: mode === "create" ? "signin" : "create" } })}
          className="iz-sm iz-muted mt-6 text-center"
        >
          {mode === "create" ? "Already have an account? " : "New here? "}
          <span className="text-[var(--iz-gold-l)]">{mode === "create" ? "Sign in" : "Create one"}</span>
        </button>
      </div>
    </PhoneFrame>
  );
}
