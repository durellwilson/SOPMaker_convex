import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { useDarkMode } from "./contexts/DarkModeContext";
import { VoiceWizard } from "./components/VoiceWizard";
import { VoiceInputService } from "./services/VoiceInputService";

export function SOPList({
  selectedSopId,
  onSelect,
}: {
  selectedSopId: Id<"sops"> | null;
  onSelect: (id: Id<"sops"> | null) => void;
}) {
  const sops = useQuery(api.sops.listSOPs) ?? [];
  const createSOP = useMutation(api.sops.createSOP);
  const updateSOP = useMutation(api.sops.updateSOP);
  const deleteSOP = useMutation(api.sops.deleteSOP);
  const { darkMode } = useDarkMode();

  const [isCreating, setIsCreating] = useState(false);
  const [editingSopId, setEditingSopId] = useState<Id<"sops"> | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMaterials, setNewMaterials] = useState("");
  const [showVoiceWizard, setShowVoiceWizard] = useState(false);
  const [currentField, setCurrentField] = useState<string | null>(null);

  const handleVoiceInput = () => {
    setShowVoiceWizard(true);
  };
  
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const id = await createSOP({ title: newTitle, description: newDescription, materials: newMaterials });
      setNewTitle("");
      setNewDescription("");
      setNewMaterials("");
      setIsCreating(false);
      onSelect(id);
      toast.success("SOP created!");
    } catch (error) {
      toast.error("Failed to create SOP");
    }
  }

  async function handleUpdate(e: React.FormEvent, id: Id<"sops">) {
    e.preventDefault();
    try {
      // Format materials before updating
      const formattedMaterials = formatMaterialsList(newMaterials);
      
      await updateSOP({ 
        id, 
        title: newTitle, 
        description: newDescription,
        materials: formattedMaterials
      });
      
      // Show success message with details
      const itemCount = formattedMaterials ? formattedMaterials.split('\n').filter(line => line.trim()).length : 0;
      const materialsMessage = itemCount > 0 ? ` with ${itemCount} materials` : "";
      toast.success(`SOP updated${materialsMessage}!`);
      setNewTitle("");
      setNewDescription("");
      setNewMaterials("");
      setEditingSopId(null);
      // Removed duplicate toast message
    } catch (error) {
      toast.error("Failed to update SOP");
    }
  }

  // Function to format materials as a list with improved handling
  const formatMaterialsList = (input: string): string => {
    if (!input.trim()) return "";
    
    // Split by new lines and filter out empty lines
    const lines = input.split('\n').filter(line => line.trim());
    
    // Format each line as a list item if it doesn't already start with a bullet or dash
    return lines.map(line => {
      const trimmed = line.trim();
      // Check for various list markers and standardize to bullet points
      if (trimmed.startsWith('• ') || trimmed.startsWith('* ') || 
          trimmed.startsWith('- ') || trimmed.startsWith('– ')) {
        return `• ${trimmed.substring(2).trim()}`;
      }
      // Handle numbered lists (e.g., "1. Item")
      if (/^\d+\.\s+/.test(trimmed)) {
        return `• ${trimmed.replace(/^\d+\.\s+/, '').trim()}`;
      }
      return `• ${trimmed}`;
    }).join('\n');
  };

  async function handleDelete(id: Id<"sops">) {
    if (!confirm("Are you sure you want to delete this SOP and all its steps?"))
      return;

    try {
      await deleteSOP({ id });
      if (selectedSopId === id) {
        onSelect(null);
      }
      toast.success("SOP deleted!");
    } catch (error) {
      toast.error("Failed to delete SOP");
    }
  }

  function startEditing(sop: {
    _id: Id<"sops">;
    title: string;
    description: string;
    materials?: string;
  }) {
    setEditingSopId(sop._id);
    setNewTitle(sop.title);
    setNewDescription(sop.description);
    setNewMaterials(sop.materials || "");
  }

  return (
    <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold dark:text-white">Your SOPs</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="bg-indigo-500 text-white px-3 py-1.5 rounded-md hover:bg-indigo-600 text-sm font-medium dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              New SOP
            </button>
            <button
              onClick={handleVoiceInput}
              className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm font-medium flex items-center gap-1 dark:bg-green-600 dark:hover:bg-green-700"
              aria-label='Start voice input wizard'
            >
              Voice Input
            </button>
          </div>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
                  onFocus={() => setCurrentField('title')}
                  onBlur={() => setCurrentField(null)}
                  placeholder="SOP Title"
              className="w-full p-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
                  onFocus={() => setCurrentField('description')}
                  onBlur={() => setCurrentField(null)}
                  placeholder="Description"
              className="w-full p-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              required
            />
            <div className="space-y-2">
              <textarea
                value={newMaterials}
                onChange={(e) => setNewMaterials(e.target.value)}
                  onBlur={(e) => setNewMaterials(formatMaterialsList(e.target.value))}
                  onFocus={() => setCurrentField('materials')}
                  onBlur={() => setCurrentField(null)}
                  placeholder="Enter materials (one per line)"
                className="w-full p-2 border rounded-md text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                spellCheck="true"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Type each material on a new line. Items will be automatically formatted as a list.
              </div>
              {newMaterials && (
                <div className="mt-2 bg-gray-50 p-3 rounded-md text-sm dark:bg-gray-700">
                  <div className="font-medium mb-1 text-xs text-gray-500 dark:text-gray-400">Preview:</div>
                  <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                    {newMaterials.split('\n')
                      .filter(line => line.trim())
                      .map((line, i) => (
                        <li key={i}>{line.replace(/^[•*\-–]\s+/, '')}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm font-medium dark:bg-green-600 dark:hover:bg-green-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle("");
                  setNewDescription("");
                  setNewMaterials("");
                }}
                className="border px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="divide-y dark:divide-gray-700">
        {sops.map((sop) => (
          <div
            key={sop._id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedSopId === sop._id
                ? "bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20"
                : "hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {editingSopId === sop._id ? (
              <form onSubmit={(e) => handleUpdate(e, sop._id)} className="space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full p-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    currentField === 'title' ? 'border-green-500 ring-1 ring-green-500' : ''
                  }`}
                  required
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={`w-full p-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    currentField === 'description' ? 'border-green-500 ring-1 ring-green-500' : ''
                  }`}
                  rows={3}
                  required
                />
                <div className="space-y-2">
                  <textarea
                    value={newMaterials}
                    onChange={(e) => setNewMaterials(e.target.value)}
                    onBlur={(e) => setNewMaterials(formatMaterialsList(e.target.value))}
                    placeholder="Enter materials (one per line)"
                    className="w-full p-2 border rounded-md text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                    spellCheck="true"
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Type each material on a new line. Items will be automatically formatted as a list.
                  </div>
                  {newMaterials && (
                    <div className="mt-2 bg-gray-50 p-3 rounded-md text-sm dark:bg-gray-700">
                      <div className="font-medium mb-1 text-xs text-gray-500 dark:text-gray-400">Preview:</div>
                      <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                        {newMaterials.split('\n')
                          .filter(line => line.trim())
                          .map((line, i) => (
                            <li key={i}>{line.replace(/^[•*\-–]\s+/, '')}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-2 py-1 rounded-md text-sm font-medium hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSopId(null);
                      setNewTitle("");
                      setNewDescription("");
                    }}
                    className="border px-2 py-1 rounded-md text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div onClick={() => onSelect(sop._id)}>
                <div className="font-medium dark:text-white">{sop.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {sop.description}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Last modified: {new Date(sop.lastModified).toLocaleDateString()}
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(sop);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sop._id);
                    }}
                    className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {showVoiceWizard && (
        <VoiceWizard
          onComplete={(data) => {
            setNewTitle(data.title);
            setNewDescription(data.description);
            setNewMaterials(data.materials);
            setShowVoiceWizard(false);
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
