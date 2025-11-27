import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Preferences {
  notifications: {
    lowStockAlerts: boolean;
    orderAlerts: boolean;
  };
  sounds: {
    enabled: boolean;
  };
}

interface UserPreferencesContextType {
  preferences: Preferences;
  updatePreferences: (newPreferences: Partial<Preferences>) => void;
  playSound: (soundType: string) => void;
}

const defaultPreferences: Preferences = {
  notifications: {
    lowStockAlerts: true,
    orderAlerts: true,
  },
  sounds: {
    enabled: true,
  },
};

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error("Failed to parse saved preferences", e);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (newPreferences: Partial<Preferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...newPreferences,
    }));
  };

  const playSound = (soundType: string) => {
    if (!preferences.sounds.enabled) return;

    // In a real implementation, you would play actual sounds here
    // For now, we'll just log to the console
    console.log(`Playing sound: ${soundType}`);

    // Example of how you might implement actual sounds:
    /*
    try {
      const audio = new Audio(`/sounds/${soundType}.mp3`);
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (e) {
      console.log('Sound play failed:', e);
    }
    */
  };

  return (
    <UserPreferencesContext.Provider
      value={{ preferences, updatePreferences, playSound }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return context;
}
