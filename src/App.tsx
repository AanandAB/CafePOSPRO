import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { StaffLoginForm } from "./StaffLoginForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { StaffAuthProvider, useStaffAuth } from "./contexts/StaffAuthContext";

// Create a separate component for the authenticated staff view
function StaffAuthenticatedApp() {
  const { staff, signOut } = useStaffAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Set default view based on staff role
  useEffect(() => {
    if (staff?.role === "kitchen") {
      setCurrentView("kitchen");
    }
  }, [staff]);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-amber-200 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">☕</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-amber-900">
              CafePOSPro
            </h1>
            <span className="hidden sm:inline text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
              Staff: {staff?.name} ({staff?.role})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden px-3 py-2 rounded-md text-amber-900 hover:bg-amber-100"
            >
              <span className="text-xl">☰</span>
            </button>
            <button
              onClick={signOut}
              className="hidden sm:inline px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Mobile Navigation Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 sm:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-64 bg-white border-r border-amber-200 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-amber-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-amber-900">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-amber-900 hover:bg-amber-100 rounded-full p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <Navigation
                currentView={currentView}
                onViewChange={setCurrentView}
              />
              <div className="p-4 border-t border-amber-200">
                <button
                  onClick={signOut}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden sm:block">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
        </div>

        <main className="flex-1 p-4 sm:p-6">
          <Dashboard currentView={currentView} />
        </main>
      </div>
    </div>
  );
}

// Create a component for the authenticated manager view
function ManagerAuthenticatedApp() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-amber-200 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">☕</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-amber-900">
              CafePOSPro
            </h1>
            <span className="hidden sm:inline text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              Manager Access
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden px-3 py-2 rounded-md text-amber-900 hover:bg-amber-100"
            >
              <span className="text-xl">☰</span>
            </button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Mobile Navigation Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 sm:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-64 bg-white border-r border-amber-200 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-amber-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-amber-900">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-amber-900 hover:bg-amber-100 rounded-full p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <Navigation
                currentView={currentView}
                onViewChange={setCurrentView}
              />
              <div className="p-4 border-t border-amber-200">
                <SignOutButton />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden sm:block">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
        </div>

        <main className="flex-1 p-4 sm:p-6">
          <Dashboard currentView={currentView} />
        </main>
      </div>
    </div>
  );
}

// Create a wrapper component for staff authentication
function StaffAuthWrapper() {
  const { isAuthenticated, isLoading } = useStaffAuth();
  const [loginType, setLoginType] = useState<"manager" | "staff">("manager");

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // If staff is authenticated, show the staff app
  if (isAuthenticated) {
    return <StaffAuthenticatedApp />;
  }

  // Otherwise, show the login form
  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 mb-2">
            Welcome to CafePOSPro
          </h2>
          <p className="text-amber-700 text-sm sm:text-base">
            Complete café management system
          </p>

          {/* Login Type Toggle */}
          <div className="flex justify-center mt-4 sm:mt-6 bg-white rounded-lg p-1 shadow-sm border border-amber-200">
            <button
              onClick={() => setLoginType("manager")}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                loginType === "manager"
                  ? "bg-amber-600 text-white"
                  : "text-gray-700 hover:text-amber-700"
              }`}
            >
              Manager Login
            </button>
            <button
              onClick={() => setLoginType("staff")}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                loginType === "staff"
                  ? "bg-amber-600 text-white"
                  : "text-gray-700 hover:text-amber-700"
              }`}
            >
              Staff Login
            </button>
          </div>
        </div>

        {loginType === "manager" ? (
          <SignInForm />
        ) : (
          <StaffLoginForm onLoginSuccess={() => {}} />
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <StaffAuthProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
        <Authenticated>
          <ManagerAuthenticatedApp />
        </Authenticated>

        <Unauthenticated>
          <StaffAuthWrapper />
        </Unauthenticated>

        <Toaster />
      </div>
    </StaffAuthProvider>
  );
}
