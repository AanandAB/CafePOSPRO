"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", "signIn");
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Invalid credentials. Please try again.";
            } else {
              toastTitle = "Could not sign in. Please try again.";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow text-sm sm:text-base"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow text-sm sm:text-base"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button
          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 border-b-2 border-white rounded-full"></span>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}
