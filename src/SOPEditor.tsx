import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { SOPExport } from './SOPExport';
import { EnhancedPDFExport } from './services/EnhancedPDFExport';
import { EnhancedMaterials } from './components/EnhancedMaterials';
import { DraggableStepList } from './components/DraggableStepList';
import { useDarkMode } from './contexts/DarkModeContext';
import { SOPGridView } from './components/SOPGridView';
import { SOPSharingPanel } from './components/SOPSharingPanel';
import { SOPComments } from './components/SOPComments';

// Helper function to optimize images before upload with improved performance
async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip optimization for small files (less than 500KB)
    if (file.size < 500 * 1024) {
      console.log('Image is already small, skipping optimization');
      resolve(file);
      return;
    }
    
    // Create an image element to load the file
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      // Release object URL
      URL.revokeObjectURL(url);
      
      // Create a canvas to resize the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: !file.type.includes('jpg') && !file.type.includes('jpeg') });
      
      if (!ctx) {
        console.warn('Canvas context creation failed, using original image');
        resolve(file);
        return;
      }
      
      // Calculate new dimensions (max width/height of 1200px while maintaining aspect ratio)
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;
      
      // Only resize if the image is larger than MAX_SIZE
      const needsResize = width > MAX_SIZE || height > MAX_SIZE;
      
      if (needsResize) {
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      
      // Set canvas dimensions and draw resized image
      canvas.width = width;
      canvas.height = height;
      
      // Use better quality settings for image rendering
      if (ctx.imageSmoothingEnabled) {
        ctx.imageSmoothingQuality = 'high';
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Determine appropriate quality based on file type and size
      let quality = 0.85; // Default quality
      
      // Adjust quality based on original file size
      if (file.size > 3 * 1024 * 1024) { // > 3MB
        quality = 0.75;
      } else if (file.size > 1 * 1024 * 1024) { // > 1MB
        quality = 0.8;
      }
      
      // Convert canvas to blob with appropriate quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn('Blob creation failed, using original image');
            resolve(file);
            return;
          }
          
          // Create new file from blob
          const optimizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          
          // Log optimization results
          const originalSizeKB = Math.round(file.size / 1024);
          const newSizeKB = Math.round(blob.size / 1024);
          const savings = Math.round(((file.size - blob.size) / file.size) * 100);
          
          console.log(`Image optimized: ${originalSizeKB}KB → ${newSizeKB}KB (${savings}% reduction)`);
          
          resolve(optimizedFile);
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error('Failed to load image for optimization');
      resolve(file); // Fallback to original file instead of rejecting
    };
    
    img.src = url;
  });
}

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
  const sopData = useQuery(api.sops.getSopWithSteps, { sopId });
  const [showMaterials, setShowMaterials] = useState(false);
  const [materials, setMaterials] = useState("");
  const { darkMode } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
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
  
  // Initialize materials from sopData when available
  useEffect(() => {
    if (sopData?.sop.materials) {
      setMaterials(sopData.sop.materials);
      setShowMaterials(true);
    }
  }, [sopData]);
  
  const handlePublishSOP = async () => {
    if (!sopData) return;
    
    try {
      // Check if we should use recipe-style grid presentation
      const useRecipeGrid = sopData.sop.materials && window.confirm(
        'Would you like to publish this SOP using the recipe-style grid layout?'
      );
      
      if (useRecipeGrid) {
        // Import RecipeGridExport dynamically
        const { RecipeGridExport } = await import('./services/RecipeGridExport');
        
        await RecipeGridExport.exportToPDF(
          sopData,
          `${sopData.sop.title.replace(/\s+/g, '_')}-Published-Recipe`,
          {
            includeHeader: true,
            includeFooter: true,
            companyName: 'SOP Builder',
            darkMode
          }
        );
        
        toast.success('SOP published successfully with recipe-style grid layout');
        return;
      }
      
      // Standard presentation format
      const tempDiv = document.createElement('div');
      tempDiv.id = 'sop-content';
      tempDiv.className = 'p-8 bg-white';
      
      // Add SOP header
      const header = document.createElement('div');
      header.innerHTML = `
        <h1 class="text-2xl font-bold mb-4">${sopData.sop.title}</h1>
        <p class="mb-6">${sopData.sop.description}</p>
        <hr class="my-6">
        <h2 class="text-xl font-semibold mb-4">Standard Operating Procedure</h2>
      `;
      tempDiv.appendChild(header);
      
      // Add Materials section if available
      if (sopData.sop.materials) {
        const materialsSection = document.createElement('div');
        materialsSection.className = 'mb-6';
        
        // Create materials header
        const materialsHeader = document.createElement('h3');
        materialsHeader.className = 'text-lg font-semibold mb-2';
        materialsHeader.textContent = 'Materials Needed:';
        materialsSection.appendChild(materialsHeader);
        
        // Create materials container
        const materialsContainer = document.createElement('div');
        materialsContainer.className = 'p-3 bg-gray-50 rounded-md';
        
        // Create proper list for materials
        const materialsList = document.createElement('ul');
        materialsList.className = 'list-disc pl-5 space-y-1';
        
        // Process each material item
        sopData.sop.materials.split('\n')
          .filter(line => line.trim())
          .forEach(line => {
            const listItem = document.createElement('li');
            // Remove bullet points or other markers from the beginning
            listItem.textContent = line.replace(/^[•*\-–]\s+/, '');
            materialsList.appendChild(listItem);
          });
        
        materialsContainer.appendChild(materialsList);
        materialsSection.appendChild(materialsContainer);
        
        // Add separator
        const separator = document.createElement('hr');
        separator.className = 'my-6';
        materialsSection.appendChild(separator);
        
        tempDiv.appendChild(materialsSection);
      }
      
      // Add steps
      const stepsContainer = document.createElement('div');
      stepsContainer.className = 'space-y-6';
      
      sopData.steps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'mb-4';
        stepElement.innerHTML = `
          <div class="flex gap-3 mb-2">
            <div class="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span class="text-lg font-semibold text-indigo-600">${index + 1}</span>
            </div>
            <div class="flex-1">
              <p class="text-gray-700">${step.instruction}</p>
            </div>
          </div>
        `;
        stepsContainer.appendChild(stepElement);
      });
      
      tempDiv.appendChild(stepsContainer);
      
      // Temporarily add to document, export, then remove
      document.body.appendChild(tempDiv);
      await EnhancedPDFExport.exportToPDF(
        'sop-content', 
        `${sopData.sop.title.replace(/\s+/g, '_')}-Published`,
        {
          includeHeader: true,
          includeFooter: true,
          companyName: 'SOP Builder',
          darkMode
        }
      );
      document.body.removeChild(tempDiv);
      
      toast.success('SOP published successfully');
    } catch (error) {
      console.error('Failed to publish SOP:', error);
      toast.error('Failed to publish SOP');
    }
  };
  const steps = useQuery(api.sops.getSteps, { sopId }) ?? [];
  const addStep = useMutation(api.sops.addStep);
  const updateStep = useMutation(api.sops.updateStep);
  const deleteStep = useMutation(api.sops.deleteStep);
  const updateSOP = useMutation(api.sops.updateSOP);
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
  
  // Handle file selection for media upload
  const handleFileSelect = (stepId: Id<"steps">, type: "image" | "video") => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-step-id', stepId.toString());
      fileInputRef.current.setAttribute('data-media-type', type);
      fileInputRef.current.click();
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
    
    // Show initial loading toast
    const loadingToast = toast.loading("Generating steps from AI...");
    
    try {
      // Validate inputs
      if (!topic.trim()) {
        toast.dismiss(loadingToast);
        toast.error("Please enter a topic for step generation");
        setIsGenerating(false);
        return;
      }
      
      // Update loading message
      toast.loading(`Generating steps for "${topic}"...`, { id: loadingToast });
      
      // Call the AI to generate steps
      const instructions = await generateSteps({ topic, context });
      
      // Process the generated steps
      if (!instructions) {
        throw new Error("No instructions were generated");
      }
      
      // Parse and clean up the steps
      const steps = instructions
        .split("\n")
        .filter((step: string) => step.trim())
        .map((step: string) => step.replace(/^\d+\.\s*/, ""));

      if (steps && steps.length > 0) {
        // Update loading message with progress
        toast.loading(`Adding ${steps.length} steps to your SOP...`, { id: loadingToast });
        
        // Add each step to the database
        for (let i = 0; i < steps.length; i++) {
          const instruction = steps[i];
          await addStep({
            sopId,
            instruction,
            orderIndex: i, // Use the actual index for proper ordering
          });
        }
        
        // Clear form and show success message
        setTopic("");
        setContext("");
        toast.dismiss(loadingToast);
        toast.success(`Successfully generated ${steps.length} steps`);
      } else {
        throw new Error("No valid steps were generated");
      }
    } catch (error) {
      console.error("Step generation error:", error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to generate steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsGenerating(false);
  }

  async function handleFileUpload(
    stepId: Id<"steps">,
    file: File,
    type: "image" | "video"
  ) {
    // Show loading toast with more detailed message
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    const loadingToast = toast.loading(
      `Preparing ${type} (${fileSize}MB)${type === "image" ? " for optimization" : ""}...`
    );
    
    try {
      // Optimize image if it's an image file
      let fileToUpload = file;
      if (type === "image") {
        toast.loading(`Optimizing image...`, { id: loadingToast });
        fileToUpload = await optimizeImage(file);
        
        // Show optimization results
        const newSize = (fileToUpload.size / (1024 * 1024)).toFixed(2);
        const savings = Math.round(((file.size - fileToUpload.size) / file.size) * 100);
        if (savings > 0) {
          toast.loading(`Uploading optimized image (${newSize}MB, ${savings}% smaller)...`, { id: loadingToast });
        } else {
          toast.loading(`Uploading image (${newSize}MB)...`, { id: loadingToast });
        }
      } else {
        toast.loading(`Uploading ${type} (${fileSize}MB)...`, { id: loadingToast });
      }
      
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file with progress tracking if supported
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const { storageId } = await uploadResponse.json();
      
      if (!storageId) {
        throw new Error("No storageId received from upload");
      }

      // Update toast to show processing status
      toast.loading(`Processing ${type}...`, { id: loadingToast });
      
      // Save file reference in database
      await uploadFile({
        sopId,
        stepId,
        storageId,
        type,
      });

      toast.dismiss(loadingToast);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if the current user is the author of the SOP
  const isAuthor = sopData && loggedInUser ? sopData.sop.authorId === loggedInUser._id : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">SOP Editor</h2>
        <div className="flex gap-2">
          <SOPExport sopId={sopId} />
          <button
            onClick={handlePublishSOP}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 dark:bg-green-600 dark:hover:bg-green-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            Publish
          </button>
        </div>
      </div>
      
      {/* Recipe Grid View (when materials are available) */}
      {sopData?.sop.materials && (
        <SOPGridView sopId={sopId} presentationType="recipe" />
      )}
      
      {/* Hidden file input for media uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const stepId = e.target.getAttribute('data-step-id');
          const mediaType = e.target.getAttribute('data-media-type') as "image" | "video";
          
          if (file && stepId && mediaType) {
            handleFileUpload(stepId as unknown as Id<"steps">, file, mediaType);
            e.target.value = ''; // Reset for future uploads
          }
        }}
      />
      
      {/* AI Assistant */}
      <div className="bg-white p-4 rounded-lg shadow-sm dark:bg-gray-800 dark:text-white">
        <h3 className="text-lg font-semibold mb-3">AI Assistant</h3>
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Coffee brewing, Server maintenance"
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any specific requirements or context"
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            {isGenerating ? "Generating..." : "Generate Steps"}
          </button>
        </form>
      </div>

      {/* Materials Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm dark:bg-gray-800">
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="showMaterials"
            checked={showMaterials}
            onChange={(e) => setShowMaterials(e.target.checked)}
            className="mr-2 h-4 w-4"
          />
          <label htmlFor="showMaterials" className="text-lg font-semibold dark:text-white">Materials Needed</label>
        </div>
        
        {showMaterials && (
          <div className="mb-4">
            {/* Use the enhanced materials component */}
            <EnhancedMaterials 
              initialMaterials={materials} 
              onSave={async (formattedMaterials) => {
                try {
                  if (!sopData) return;
                  setMaterials(formattedMaterials);
                  await updateSOP({
                    id: sopId,
                    title: sopData.sop.title,
                    description: sopData.sop.description,
                    materials: formattedMaterials
                  });
                } catch (error) {
                  throw error;
                }
              }}
            />
          </div>
        )}
      </div>
      
      {/* Add New Step */}
      <div className="bg-white p-4 rounded-lg shadow-sm dark:bg-gray-800">
        <form onSubmit={handleAddStep}>
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Add a new step..."
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={2}
            required
          />
          <button
            type="submit"
            className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
          >
            Add Step
          </button>
        </form>
      </div>

      {/* Draggable Steps List */}
      <DraggableStepList
        steps={steps}
        sopId={sopId}
        onEdit={(step) => {
          setEditingStepId(step._id);
          setEditingInstruction(step.instruction);
        }}
        onDelete={handleDeleteStep}
        onAddMedia={handleFileSelect}
        StepMedia={StepMedia}
      />
      
      {/* Step Editing Modal */}
      {editingStepId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Edit Step</h3>
            <form onSubmit={handleUpdateStep} className="space-y-4">
              <textarea
                value={editingInstruction}
                onChange={(e) => setEditingInstruction(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={4}
                required
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStepId(null);
                    setEditingInstruction("");
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Sharing panel */}
      <SOPSharingPanel sopId={sopId} isAuthor={isAuthor} />
      
      {/* Comments section */}
      <SOPComments sopId={sopId} />
    </div>
  );
}
