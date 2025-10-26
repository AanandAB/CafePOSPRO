"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface StaffAuthContextType {
  staff: Staff | null;
  signIn: (email: string, pin: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(
  undefined
);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const validateStaffPin = useMutation(api.auth.validateStaffPin);

  useEffect(() => {
    // Check if there's a stored session
    const storedStaff = localStorage.getItem("staffSession");
    if (storedStaff) {
      try {
        const parsedStaff = JSON.parse(storedStaff);
        setStaff(parsedStaff);
        setIsAuthenticated(true);
      } catch (error) {
        // Invalid session data, clear it
        localStorage.removeItem("staffSession");
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, pin: string) => {
    try {
      const staffInfo = await validateStaffPin({ email, pin });

      // Store session in localStorage
      localStorage.setItem("staffSession", JSON.stringify(staffInfo));

      setStaff(staffInfo);
      setIsAuthenticated(true);
    } catch (error) {
      // Remove any existing session
      localStorage.removeItem("staffSession");
      setStaff(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem("staffSession");
    setStaff(null);
    setIsAuthenticated(false);
  };

  return (
    <StaffAuthContext.Provider
      value={{ staff, signIn, signOut, isAuthenticated, isLoading }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error("useStaffAuth must be used within a StaffAuthProvider");
  }
  return context;
}
