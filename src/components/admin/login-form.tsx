"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-paper/80">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" className="field" required />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-paper/80">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="field" required />
      </div>
      {state.error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center disabled:opacity-50" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
