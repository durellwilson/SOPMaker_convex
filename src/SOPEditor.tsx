import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { SOPExport } from './SOPExport';

function StepMedia({
  type,
  storageId,
}: {
  type: "image" | "video";
  storageId: Id<"_storage">;
}) {
  const url = useQuery(api.sops.getStorageUrl, { storageId });
  if (!url) return null;

  if (type === "image") {
    return (
      <img
        src={url}
        alt="Step illustration"
        className="mt-4 max-w-full h-auto rounded-lg"
      />
    );
  } else {
    return (
      <video
        src={url}
        controls
        className="mt-4 max-w-full rounded-lg"
      />
    );
  }
}

export function SOPEditor({ sopId }: { sopId: Id<"sops"> }) {
  const handleExportPDF = () => {
    PDFExportService.exportToPDF("sop-content", "SOP-Document");
  };
  const steps = useQuery(api.sops.getSteps, { sopId }) ?? [];
  const addStep = useMutation(api.sops.addStep);
  const updateStep = useMutation(api.sops.updateStep);
  const deleteStep = useMutation(api.sops.deleteStep);
  const generateSteps = useAction(api.sops.generateSteps);
  const generateUploadUrl = useMutation(api.sops.generateUploadUrl);
  const uploadFile = useMutation(api.sops.uploadFile);

  const [newInstruction, setNewInstruction] = useState("");
  const [editingStepId, setEditingStepId] = useState<Id<"steps"> | null>(null);
  const [editingInstruction, setEditingInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addStep({
        sopId,
        instruction: newInstruction,
        orderIndex: steps.length,
      });
      setNewInstruction("");
      toast.success("Step added");
    } catch (error) {
      toast.error("Failed to add step");
    }
  }

  async function handleUpdateStep(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStepId) return;

    try {
      await updateStep({
        stepId: editingStepId,
        instruction: editingInstruction,
      });
      setEditingStepId(null);
      setEditingInstruction("");
      toast.success("Step updated");
    } catch (error) {
      toast.error("Failed to update step");
    }
  }

  async function handleDeleteStep(stepId: Id<"steps">) {
    try {
      await deleteStep({ stepId, sopId });
      toast.success("Step deleted");
    } catch (error) {
      toast.error("Failed to delete step");
    }
  }

  function startEditing(step: { _id: Id<"steps">; instruction: string }) {
    setEditingStepId(step._id);
    setEditingInstruction(step.instruction);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const instructions = await generateSteps({ topic, context });
      const steps = instructions
        ?.split("\n")
        .filter((step: string) => step.trim())
        .map((step: string) => step.replace(/^\d+\.\s*/, ""));

      if (steps) {
        for (const instruction of steps) {
          await addStep({
            sopId,
            instruction,
            orderIndex: steps.length,
          });
        }
      }

      setTopic("");
      setContext("");
      toast.success("Steps generated");
    } catch (error) {
      toast.error("Failed to generate steps");
    }
    setIsGenerating(false);
  }

  async function handleFileUpload(
    stepId: Id<"steps">,
    file: File,
    type: "image" | "video"
  ) {
    try {
      const uploadUrl = await generateUploadUrl();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const { storageId } = await uploadResponse.json();
      
      if (!storageId) {
        throw new Error("No storageId received from upload");
      }

      await uploadFile({
        sopId,
        stepId,
        storageId,
        type,
      });

      toast.success(`${type} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-end">
        <SOPExport sopId={sopId} />
      </div>
      
      {/* AI Assistant */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">AI Assistant</h3>
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Coffee brewing, Server maintenance"
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any specific requirements or context"
              className="w-full p-2 border rounded-md"
              rows={2}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Steps"}
          </button>
        </form>
      </div>

      {/* Add New Step */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <form onSubmit={handleAddStep}>
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Add a new step..."
            className="w-full p-2 border rounded-md"
            rows={2}
            required
          />
          <button
            type="submit"
            className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Add Step
          </button>
        </form>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step._id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-indigo-600">{index + 1}</span>
              </div>
              <div className="flex-1">
                {editingStepId === step._id ? (
                  <form onSubmit={handleUpdateStep} className="space-y-2">
                    <textarea
                      value={editingInstruction}
                      onChange={(e) => setEditingInstruction(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows={2}
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStepId(null);
                          setEditingInstruction("");
                        }}
                        className="flex-1 border px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-gray-700">{step.instruction}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditing(step)}
                        className="text-blue-500 hover:text-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step._id)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                      <label className="cursor-pointer bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 text-sm">
                        Add Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(step._id, file, "image");
                            }
                          }}
                        />
                      </label>
                      <label className="cursor-pointer bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 text-sm">
                        Add Video
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(step._id, file, "video");
                            }
                          }}
                        />
                      </label>
                    </div>
                    {step.imageId && (
                      <StepMedia type="image" storageId={step.imageId} />
                    )}
                    {step.videoId && (
                      <StepMedia type="video" storageId={step.videoId} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
