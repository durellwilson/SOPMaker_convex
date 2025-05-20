import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SOPList } from "./SOPList";
import { SOPEditor } from "./SOPEditor";
import { SOPSearch } from "./SOPSearch";
import { SharedSOPList } from "./SharedSOPList";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { DarkModeProvider, useDarkMode } from "./contexts/DarkModeContext";
import { AppVoiceIndicator } from "./components/voice/AppVoiceIndicator";

// Dark mode toggle button component
function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  
  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}

function AppContent() {
  const [selectedSopId, setSelectedSopId] = useState<Id<"sops"> | null>(null);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { darkMode } = useDarkMode();

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold accent-text dark:text-white">SOP Builder</h1>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <Authenticated>
                <span className="text-slate-600 dark:text-slate-300">
                  {loggedInUser?.email}
                </span>
              </Authenticated>
              <SignOutButton />
            </div>
          </div>
        </header>

      <main className="flex-1 flex flex-col">
        <Unauthenticated>
          <div className="max-w-md mx-auto p-8">
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-4 text-center">
              Sign in to get started
            </p>
            <SignInForm />
          </div>
        </Unauthenticated>

        <Authenticated>
          <div className="max-w-7xl mx-auto w-full flex-1 p-4">
            <SOPSearch onSelect={setSelectedSopId} />
            <div className="mb-6">
              <SOPList
                selectedSopId={selectedSopId}
                onSelect={setSelectedSopId}
              />
            </div>
            <div className="mb-6">
              <SharedSOPList onSelect={setSelectedSopId} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg">
              {selectedSopId ? (
                <SOPEditor sopId={selectedSopId} />
              ) : (
                <div className="text-center text-slate-600 dark:text-slate-300 p-8">
                  Select or create an SOP to get started
                </div>
              )}
            </div>
          </div>
        </Authenticated>
      </main>
      {/* Global voice recording indicator */}
      <AppVoiceIndicator />
      <Toaster position="bottom-center" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DarkModeProvider>
      <AppContent />
    </DarkModeProvider>
  );
}
