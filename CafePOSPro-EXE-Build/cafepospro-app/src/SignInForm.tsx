"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Add name to form data if signing up
    if (isSignUp && name) {
      formData.set("name", name);
    }
    
    formData.set("flow", isSignUp ? "signUp" : "signIn");
    
    void signIn("password", formData).then(() => {
      if (isSignUp) {
        toast.success("Account created successfully! Please sign in.");
        setIsSignUp(false);
        setName("");
      }
    }).catch((error: any) => {
      console.error("Auth error:", error);
      let toastTitle = "";
      if (isSignUp) {
        if (error.message?.includes("already exists")) {
          toastTitle = "An account with this email already exists.";
        } else {
          toastTitle = "Could not create account. Please try again.";
        }
      } else if (error.message?.includes("Invalid password")) {
        toastTitle = "Invalid credentials. Please try again.";
      } else if (error.message?.includes("not found")) {
        toastTitle = "No account found with this email.";
      } else {
        toastTitle = "Could not sign in. Please try again.";
      }
      toast.error(toastTitle);
    }).finally(() => {
      setSubmitting(false);
    });
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {isSignUp && (
          <input
            className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow text-sm sm:text-base"
            type="text"
            name="name"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required={isSignUp}
          />
        )}
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
        <input
          type="hidden"
          name="flow"
          value={isSignUp ? "signUp" : "signIn"}
        />
        <button
          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 border-b-2 border-white rounded-full"></span>
              {isSignUp ? "Creating Account..." : "Signing in..."}
            </span>
          ) : (
            isSignUp ? "Sign Up" : "Sign In"
          )}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            if (!isSignUp) {
              // Reset name when switching to signup
              setName("");
            }
          }}
          className="text-primary hover:text-primary-hover font-medium text-sm"
          type="button"
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}