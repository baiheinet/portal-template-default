"use client";

import { useState } from "react";
import { Chrome, Github } from "lucide-react";
import { useLink, useLogin } from "@refinedev/core";

import { AuthLayout } from "@/components/auth/auth-layout";
import { InputPassword } from "@/components/auth/input-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SignInForm = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const Link = useLink();
  const { mutate: login } = useLogin();

  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ username: account, password });
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Use your NocoBase account to continue."
    >
      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="account">Username or email</Label>
          <Input
            id="account"
            type="text"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            autoComplete="username"
            autoFocus
            required
            className="h-11 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <InputPassword
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="h-11 rounded-lg"
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full rounded-lg">
          Sign in
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link
            to="/forgot-password"
            className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
          >
            Forgot password?
          </Link>
          <span>
            No account?{" "}
            <Link
              to="/register"
              className="font-semibold text-foreground underline underline-offset-4"
            >
              Sign up
            </Link>
          </span>
        </div>

        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => login({ providerName: "google" })}
          >
            <Chrome />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => login({ providerName: "github" })}
          >
            <Github />
            GitHub
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

SignInForm.displayName = "SignInForm";
