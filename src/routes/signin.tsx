import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Logo, PhoneFrame } from "@/components/Brand";
import { ArrowLeft, Mail, User, Lock } from "lucide-react";

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: (s.mode === "create" ? "create" : "signin") as "signin" | "create" }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const role = useStore((s) => s.role);
  const signIn = useStore((s) => s.signIn);
  const [name, setName] = useState(mode === "create" ? "" : "Alex Tan");
  const [email, setEmail] = useState(mode === "create" ? "" : "alex@innocenz.app");
  const [password, setPassword] = useState("••••••••");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signIn(name || email.split("@")[0], email);
    const path =
      role === "vendor" ? "/outlet"
      : role === "host" ? "/host"
      : role === "agency" ? "/agency"
      : role === "admin" ? "/admin"
      : "/host";
    navigate({ to: path });
  };

  return (
    <PhoneFrame className="px-6 pb-8 pt-10">
      <button onClick={() => navigate({ to: "/" })} className="glass flex h-10 w-10 items-center justify-center rounded-full">
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="mt-8 flex flex-col items-center">
        <Logo size="md" />
      </div>

      <h1 className="mt-8 text-2xl font-display font-semibold">
        {mode === "create" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "create" ? "Join the InnocenZ network." : "Sign in to continue."}
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        {mode === "create" && (
          <Field icon={<User className="h-4 w-4" />} value={name} onChange={setName} placeholder="Full name" />
        )}
        <Field icon={<Mail className="h-4 w-4" />} value={email} onChange={setEmail} placeholder="Email" type="email" />
        <Field icon={<Lock className="h-4 w-4" />} value={password} onChange={setPassword} placeholder="Password" type="password" />

        <button type="submit" className="mt-4 rounded-full bg-gradient-primary py-4 font-semibold shadow-glow active:scale-[0.98]">
          {mode === "create" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <button
        onClick={() => navigate({ to: "/signin", search: { mode: mode === "create" ? "signin" : "create" } })}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        {mode === "create" ? "Already have an account? " : "New here? "}
        <span className="text-primary underline-offset-2 hover:underline">
          {mode === "create" ? "Sign in" : "Create one"}
        </span>
      </button>
    </PhoneFrame>
  );
}

function Field({ icon, value, onChange, placeholder, type = "text" }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 focus-within:border-primary">
      <span className="text-muted-foreground">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
