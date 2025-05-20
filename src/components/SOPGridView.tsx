import React, { useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useDarkMode } from '../contexts/DarkModeContext';
import { toast } from 'sonner';

interface SOPGridViewProps {
  sopId: Id<"sops">;
  presentationType?: 'recipe' | 'standard';
}

interface MaterialStepMapping {
  materialIndex: number;
  stepIndices: number[];
}

/**
 * SOPGridView component displays SOP content in a recipe-style grid layout
 * with materials on the left and procedure steps on the right.
 * The layout is designed to express the relationship between materials and step timing.
 */
export function SOPGridView({ sopId, presentationType = 'recipe' }: SOPGridViewProps) {
  const sopData = useQuery(api.sops.getSopWithSteps, { sopId });
  const { darkMode } = useDarkMode();
  const [editMode, setEditMode] = useState(false);
  const [materialMappings, setMaterialMappings] = useState<MaterialStepMapping[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const updateSOP = useMutation(api.sops.updateSOP);

  if (!sopData) return <div className="p-4">Loading...</div>;

  const { sop, steps } = sopData;
  
  // If no materials are available or standard presentation is requested, return null
  if (!sop.materials || presentationType === 'standard') return null;

  // Parse materials into an array
  const materials = sop.materials
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^[•*\-–]\s+/, '').trim());
    
  // Initialize material mappings when sopData changes
  React.useEffect(() => {
    if (sopData) {
      // Check if sopData has metadata for material mappings
      if (sopData.sop.materialMappings) {
        try {
          const parsedMappings = JSON.parse(sopData.sop.materialMappings);
          setMaterialMappings(parsedMappings);
          // Reset editing state when loading from server
          setIsEditing(false);
        } catch (e) {
          console.error('Failed to parse material mappings:', e);
          // Fall back to generating default mappings
          generateDefaultMappings();
        }
      } else {
        // Generate default mappings if none exist
        generateDefaultMappings();
        // Reset editing state when generating defaults
        setIsEditing(false);
      }
    }
  }, [sopData]); // Only depend on sopData changes

  // Generate default mappings based on a more accurate sandwich-making process
  const generateDefaultMappings = () => {
    if (!sopData || !steps.length) return;
    
    const newMappings = materials.map((material, materialIndex) => {
      // More accurate sandwich-making process
      // Bread is used in steps 1 and 3 (first and third steps)
      if (materialIndex === 1 && steps.length >= 3) { // Bread
        return { materialIndex, stepIndices: [0, 2] };
      }
      // Toppings (meat, cheese, lettuce, tomato) are placed in step 2
      else if ([2, 3, 4, 5].includes(materialIndex) && steps.length >= 2) {
        return { materialIndex, stepIndices: [1] };
      }
      // Condiments and other items
      else if (materialIndex === 0 && steps.length >= 4) { // Knife
        return { materialIndex, stepIndices: [0, 3] };
      }
      else if (materialIndex === 6 && steps.length >= 2) { // Pickles
        return { materialIndex, stepIndices: [1] };
      }
      else if (materialIndex === 7 && steps.length >= 4) { // Mustard
        return { materialIndex, stepIndices: [0, 3] };
      }
      // Default fallback - assign to a step based on index
      else {
        const stepIndex = Math.min(Math.floor(materialIndex * steps.length / materials.length), steps.length - 1);
        return { materialIndex, stepIndices: [stepIndex] };
      }
    });
    
    setMaterialMappings(newMappings);
  };
  
  // Get material usage array from materialMappings
  const materialUsage = materialMappings.length === materials.length
    ? materialMappings.map(mapping => mapping.stepIndices)
    : materials.map((_, index) => [Math.min(index, steps.length - 1)]);
  
  // Helper function to generate the segmented progress bar
  const generateSegmentedProgressBar = (usedInSteps, totalSteps) => {
    // Create segments that represent the entire timeline
    const segments = [];
    
    // Each segment represents a step in the procedure
    for (let i = 0; i < totalSteps; i++) {
      const isUsedInThisStep = usedInSteps.includes(i);
      segments.push(
        <div 
          key={i}
          className={`h-full ${isUsedInThisStep ? 'bg-indigo-400 dark:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          style={{ width: `${100 / totalSteps}%` }}
        />
      );
    }
    
    return segments;
  };

  // Handle toggling step selection for a material
  const toggleStepForMaterial = (materialIndex: number, stepIndex: number) => {
    // Set editing flag to true to indicate unsaved changes
    setIsEditing(true);
    
    setMaterialMappings(prevMappings => {
      // Create a deep copy of the previous mappings to avoid mutation issues
      const newMappings = JSON.parse(JSON.stringify(prevMappings));
      const mapping = newMappings.find(m => m.materialIndex === materialIndex);
      
      if (mapping) {
        // Toggle the step - if it's already included, remove it, otherwise add it
        if (mapping.stepIndices.includes(stepIndex)) {
          mapping.stepIndices = mapping.stepIndices.filter(idx => idx !== stepIndex);
        } else {
          mapping.stepIndices = [...mapping.stepIndices, stepIndex].sort((a, b) => a - b);
        }
      } else {
        // If mapping doesn't exist for this material, create a new one
        newMappings.push({
          materialIndex,
          stepIndices: [stepIndex]
        });
      }
      
      return newMappings;
    });
  };

  // Save the updated material mappings
  const saveMaterialMappings = async () => {
    try {
      if (!sopData) return;
      
      // Only proceed if there are actual changes to save
      if (!isEditing) {
        toast.info('No changes to save');
        return;
      }
      
      // Show saving indicator
      toast.loading('Saving changes...');
      
      await updateSOP({
        id: sopId,
        materialMappings: JSON.stringify(materialMappings),
        // Include required fields
        title: sopData.sop.title,
        description: sopData.sop.description || '',
        materials: sopData.sop.materials || ''
      });
      
      // Reset editing states
      setIsEditing(false);
      
      // Optionally exit edit mode if desired
      // setEditMode(false);
      
      toast.success('Material mappings saved successfully');
    } catch (error) {
      console.error('Failed to save material mappings:', error);
      toast.error('Failed to save material mappings');
    }
  };
  
  // Function to cancel editing and revert to saved state
  const cancelEditing = () => {
    // Reset to the server state by re-initializing from sopData
    if (sopData && sopData.sop.materialMappings) {
      try {
        const parsedMappings = JSON.parse(sopData.sop.materialMappings);
        setMaterialMappings(parsedMappings);
      } catch (e) {
        generateDefaultMappings();
      }
    } else {
      generateDefaultMappings();
    }
    
    // Reset editing state
    setIsEditing(false);
    toast.info('Changes discarded');
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden border dark:border-gray-700">
      {/* Recipe-style grid header */}
      <div className="bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 p-3 border-b dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-center text-indigo-700 dark:text-indigo-300">
            {sop.title} - Procedure Grid
          </h3>
          <button 
            onClick={() => setEditMode(!editMode)}
            className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-700"
          >
            {editMode ? 'View Mode' : 'Edit Mappings'}
          </button>
        </div>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-1">
          {editMode ? 'Click on step numbers to edit material usage' : 'Preheat environment before starting'}
        </p>
      </div>

      {/* Recipe-style grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x dark:divide-gray-700">
        {/* Materials column */}
        <div className="md:col-span-4 bg-gray-50 dark:bg-gray-800">
          <div className="p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Materials</h4>
            {editMode && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Select which steps each material is used in:
                </p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={saveMaterialMappings}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${isEditing ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' : 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'}`}
                    disabled={!isEditing}
                  >
                    {isEditing ? 'Save Changes' : 'No Changes to Save'}
                  </button>
                  {isEditing && (
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
            <ul className="space-y-3">
              {materials.map((material, index) => {
                const usedInSteps = materialUsage[index] || [];
                // Get the step numbers (1-indexed) for display
                const stepNumbers = usedInSteps.map(stepIndex => stepIndex + 1);
                
                return (
                  <li key={index} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-50 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">{material}</span>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Step{stepNumbers.length > 1 ? 's' : ''}</span>
                          <div className="flex space-x-1">
                            {editMode ? (
                              // In edit mode, show all step numbers with toggle functionality
                              steps.map((_, stepIndex) => {
                                const isUsed = usedInSteps.includes(stepIndex);
                                return (
                                  <div 
                                    key={stepIndex} 
                                    onClick={() => toggleStepForMaterial(index, stepIndex)}
                                    className={`w-5 h-5 ${isUsed ? 'bg-indigo-500 dark:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-colors ${isEditing ? 'ring-1 ring-offset-1 ring-indigo-300 dark:ring-indigo-700' : ''}`}
                                  >
                                    <span className={`text-xs font-medium ${isUsed ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{stepIndex + 1}</span>
                                  </div>
                                );
                              })
                            ) : (
                              // In view mode, only show steps where the material is used
                              stepNumbers.map(stepNum => (
                                <div key={stepNum} className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-50 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{stepNum}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Segmented visual indicator for material usage across steps */}
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        {generateSegmentedProgressBar(usedInSteps, steps.length)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Steps column */}
        <div className="md:col-span-8">
          <div className="p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Procedure Steps</h4>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-50 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300">{step.instruction}</p>
                    {step.imageId && (
                      <div className="mt-2 rounded-md overflow-hidden border dark:border-gray-700">
                        {/* Image would be displayed here */}
                        <div className="bg-gray-100 dark:bg-gray-700 h-24 flex items-center justify-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Image for step {index + 1}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}