"use client";

import { useState } from "react";
import { Chrome, Github } from "lucide-react";
import { useLink, useNotification, useRegister } from "@refinedev/core";

import { AuthLayout } from "@/components/auth/auth-layout";
import { InputPassword } from "@/components/auth/input-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { open } = useNotification();
  const Link = useLink();
  const { mutate: register } = useRegister();

  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      open?.({
        type: "error",
        message: "Passwords don't match",
        description: "Please make sure both password fields match.",
      });
      return;
    }

    register({ email, password });
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Create your NocoBase account."
    >
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
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
            autoComplete="new-password"
            required
            className="h-11 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <InputPassword
            id="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            className="h-11 rounded-lg"
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full rounded-lg">
          Sign up
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>

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
            onClick={() => register({ providerName: "google" })}
          >
            <Chrome />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => register({ providerName: "github" })}
          >
            <Github />
            GitHub
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

SignUpForm.displayName = "SignUpForm";
