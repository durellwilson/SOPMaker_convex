import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

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

  const [isCreating, setIsCreating] = useState(false);
  const [editingSopId, setEditingSopId] = useState<Id<"sops"> | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const id = await createSOP({ title: newTitle, description: newDescription });
      setNewTitle("");
      setNewDescription("");
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
      await updateSOP({ id, title: newTitle, description: newDescription });
      setNewTitle("");
      setNewDescription("");
      setEditingSopId(null);
      toast.success("SOP updated!");
    } catch (error) {
      toast.error("Failed to update SOP");
    }
  }

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
  }) {
    setEditingSopId(sop._id);
    setNewTitle(sop.title);
    setNewDescription(sop.description);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your SOPs</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-indigo-500 text-white px-3 py-1.5 rounded-md hover:bg-indigo-600 text-sm font-medium"
          >
            New SOP
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="SOP Title"
              className="w-full p-2 border rounded-md text-sm"
              required
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description"
              className="w-full p-2 border rounded-md text-sm"
              rows={3}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm font-medium"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
                className="border px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="divide-y">
        {sops.map((sop) => (
          <div
            key={sop._id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedSopId === sop._id
                ? "bg-indigo-50"
                : "hover:bg-gray-50"
            }`}
          >
            {editingSopId === sop._id ? (
              <form onSubmit={(e) => handleUpdate(e, sop._id)} className="space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  required
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  rows={3}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-2 py-1 rounded-md text-sm font-medium hover:bg-green-600"
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
                    className="border px-2 py-1 rounded-md text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div onClick={() => onSelect(sop._id)}>
                <div className="font-medium">{sop.title}</div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {sop.description}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Last modified: {new Date(sop.lastModified).toLocaleDateString()}
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(sop);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sop._id);
                    }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
