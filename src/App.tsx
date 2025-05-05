import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SOPList } from "./SOPList";
import { SOPEditor } from "./SOPEditor";
import { SOPSearch } from "./SOPSearch";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [selectedSopId, setSelectedSopId] = useState<Id<"sops"> | null>(null);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold accent-text">SOP Builder</h1>
          <div className="flex items-center gap-4">
            <Authenticated>
              <span className="text-slate-600">
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
            <p className="text-lg text-slate-600 mb-4 text-center">
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
            <div className="bg-gray-50 rounded-lg">
              {selectedSopId ? (
                <SOPEditor sopId={selectedSopId} />
              ) : (
                <div className="text-center text-slate-600 p-8">
                  Select or create an SOP to get started
                </div>
              )}
            </div>
          </div>
        </Authenticated>
      </main>
      <Toaster position="bottom-center" />
    </div>
  );
}
