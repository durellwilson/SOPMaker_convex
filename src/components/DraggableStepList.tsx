import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';

type Step = {
  _id: Id<"steps">;
  instruction: string;
  orderIndex: number;
  imageId?: Id<"_storage">;
  videoId?: Id<"_storage">;
};

type DraggableStepListProps = {
  steps: Step[];
  sopId: Id<"sops">;
  onEdit: (step: Step) => void;
  onDelete: (stepId: Id<"steps">) => void;
  onAddMedia: (stepId: Id<"steps">, type: "image" | "video") => void;
  StepMedia: React.FC<{ type: "image" | "video"; storageId: Id<"_storage"> }>;
};

export function DraggableStepList({
  steps,
  sopId,
  onEdit,
  onDelete,
  onAddMedia,
  StepMedia
}: DraggableStepListProps) {
  const [draggedStep, setDraggedStep] = useState<Step | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<Step[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [commandTimeout, setCommandTimeout] = useState<NodeJS.Timeout | null>(null);
  const updateStepOrder = useMutation(api.sops.updateStepOrder);
  
  // Reference to track if we need to save reordering
  const needsReordering = useRef(false);

  // Initialize steps ordering
  useEffect(() => {
    if (steps.length > 0) {
      setOrderedSteps([...steps].sort((a, b) => a.orderIndex - b.orderIndex));
    }
  }, [steps]);

  // Initialize speech recognition for voice commands
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true; // Keep listening until explicitly stopped
      recognition.interimResults = true; // Process partial results for faster response
      recognition.lang = 'en-US';
      
      // Track the last recognized command to avoid duplicates
      let lastCommand = '';
      let commandConfidence = 0;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the latest result
        const resultIndex = event.results.length - 1;
        const transcript = event.results[resultIndex][0].transcript.toLowerCase();
        const confidence = event.results[resultIndex][0].confidence;
        const isFinal = event.results[resultIndex].isFinal;
        const command = transcript.trim();
        
        // Only process if it's a final result or a high-confidence interim result
        if (isFinal || confidence > 0.8) {
          // Avoid duplicate processing of the same command
          if (command !== lastCommand || confidence > commandConfidence + 0.1) {
            setVoiceCommand(command);
            processVoiceCommand(command);
            lastCommand = command;
            commandConfidence = confidence;
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        // Provide more helpful error messages
        if (event.error === 'no-speech') {
          toast.info('No speech detected. Please try speaking again.');
        } else if (event.error === 'aborted') {
          // Don't show error for user-initiated abort
        } else if (event.error === 'network') {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error(`Voice recognition error: ${event.error}`);
        }
        setIsListening(false);
      };
      
      recognition.onend = () => {
        // Only change listening state if the recognition actually stopped
        // This helps prevent unexpected state changes during brief pauses
        setIsListening(false);
        
        // Auto-restart after brief network errors if user was actively using voice
        if (lastCommand && navigator.onLine) {
          setTimeout(() => {
            if (!isListening && document.hasFocus()) {
              // Attempt to restart if user was actively using voice commands
              recognition.start();
              setIsListening(true);
            }
          }, 1000);
        }
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  // Fuzzy matching utility for voice commands
  const fuzzyMatch = (input: string, patterns: string[]): boolean => {
    input = input.toLowerCase().trim();
    return patterns.some(pattern => {
      // Calculate similarity (basic implementation)
      const maxLength = Math.max(input.length, pattern.length);
      let matches = 0;
      
      // Count matching characters
      for (let i = 0; i < Math.min(input.length, pattern.length); i++) {
        if (input[i] === pattern[i]) matches++;
      }
      
      // Return true if similarity is above threshold (70%)
      return matches / maxLength > 0.7;
    });
  };
  
  // Process voice commands with enhanced error handling and fuzzy matching
  const processVoiceCommand = (command: string) => {
    // Normalize and trim the command
    const normalizedCommand = command.toLowerCase().trim();
    
    // Timeout reference for pauses
    let pauseTimeout: number | null = null;
    
    // Enhanced command patterns with more variations and common speech recognition errors
    const addStepPattern = /(?:add|create|new|ad|at|insert|had|and|act) (?:step|steps|stop|stops|point|procedure|stuff|staff|stock|setup|ship|tip)(.*)$/i;
    const addMaterialPattern = /(?:add|create|new|ad|at|insert|had|and|act) (?:material|materials|materia|material's|supplies|supply)(.*)$/i;
    const deleteStepPattern = /(?:delete|remove|eliminate|del|dell|get rid of) (?:step|steps|stop|stops|point) (\d+|last|that|this|it)/i;
    const moveStepPattern = /(?:move|shift|reorder|place|put) (?:step|steps|stop|stops) (\d+|last) (?:before|after|above|below|to|next to|by|near) (?:step|steps|stop|stops) (\d+|last)/i;
    const nextStepPattern = /(?:next|continue|forward|go next|next step|move on|proceed|following|advance|go forward)/i;
    const previousStepPattern = /(?:previous|back|backward|go back|prev step|back step|prior|earlier|before|preceding)/i;
    
    // Check for add material command - new implementation
    if (addMaterialPattern.test(normalizedCommand)) {
      const match = normalizedCommand.match(addMaterialPattern);
      if (match && match[1]) {
        const materialDescription = match[1].trim();
        if (materialDescription) {
          // Show feedback for material addition
          toast.success(`Adding material: ${materialDescription}`);
          // This would need to be implemented via a parent component callback
          // onAddMaterial(materialDescription);
          return true;
        }
      }
    }
    
    // Add step command with enhanced error handling
    if (addStepPattern.test(normalizedCommand)) {
      const match = normalizedCommand.match(addStepPattern);
      if (match && match[1]) {
        const instruction = match[1].trim();
        if (instruction) {
          // Call parent component to add a step
          toast.success(`Adding step: ${instruction}`);
          // This would need to be implemented in the parent component
          // onAddStep(instruction);
          return true;
        } else {
          // Handle the case where user just says "add step" without content
          toast.info("Please specify what the step should contain");
          return false;
        }
      }
    } else if (deleteStepPattern.test(normalizedCommand)) {
      const match = normalizedCommand.match(deleteStepPattern);
      if (match && match[1]) {
        const stepRef = match[1].toLowerCase();
        let stepIndex = -1;
        
        // Enhanced handling of step references
        if (stepRef === 'last') {
          stepIndex = orderedSteps.length - 1;
        } else if (stepRef === 'that' || stepRef === 'this' || stepRef === 'it') {
          // For contextual references like "delete that step", 
          // we could use the most recently selected step or the focused step
          // This would require tracking the current step in state
          if (orderedSteps.length > 0) {
            // For now, assume it's the last step for demonstration
            stepIndex = orderedSteps.length - 1;
            toast.info(`Assuming you meant the last step (${stepIndex + 1})`);
          }
        } else {
          // Try parsing as number with more robust error handling
          const stepNumber = parseInt(stepRef);
          if (!isNaN(stepNumber)) {
            if (stepNumber > 0 && stepNumber <= orderedSteps.length) {
              stepIndex = stepNumber - 1;
            } else {
              toast.error(`Step ${stepNumber} doesn't exist (valid range: 1-${orderedSteps.length})`);
              return false;
            }
          }
        }
        
        if (stepIndex >= 0) {
          const stepToDelete = orderedSteps[stepIndex];
          toast.success(`Deleting step ${stepIndex + 1}: "${stepToDelete.instruction.substring(0, 20)}${stepToDelete.instruction.length > 20 ? '...' : ''}"`);
          onDelete(stepToDelete._id);
          return true;
        } else {
          toast.error(`Couldn't determine which step to delete`);
          return false;
        }
      }
    } else if (moveStepPattern.test(normalizedCommand)) {
      const match = normalizedCommand.match(moveStepPattern);
      if (match && match[1] && match[2]) {
        let sourceIndex = -1;
        
        // Handle 'last' and contextual references for source
        if (match[1].toLowerCase() === 'last') {
          sourceIndex = orderedSteps.length - 1;
        } else if (match[1].toLowerCase() === 'this' || match[1].toLowerCase() === 'that') {
          // Use currently selected step if available, otherwise use last step
          // This would need tracking of selected step in state
          sourceIndex = orderedSteps.length - 1; // Fallback to last step
          toast.info(`Assuming you meant the last step (${sourceIndex + 1})`);
        } else {
          const srcStepNum = parseInt(match[1]);
          if (!isNaN(srcStepNum)) {
            if (srcStepNum > 0 && srcStepNum <= orderedSteps.length) {
              sourceIndex = srcStepNum - 1;
            } else {
              toast.error(`Step ${srcStepNum} doesn't exist (valid range: 1-${orderedSteps.length})`);
              return false;
            }
          }
        }
        
        let targetIndex = -1;
        // Handle 'last' and contextual references for target
        if (match[3]?.toLowerCase() === 'last') {
          targetIndex = orderedSteps.length - 1;
        } else if (match[3]?.toLowerCase() === 'this' || match[3]?.toLowerCase() === 'that') {
          // Similar contextual handling as above
          targetIndex = orderedSteps.length - 1; // Fallback
          toast.info(`Assuming target is the last step (${targetIndex + 1})`);
        } else if (match[3]?.toLowerCase() === 'first') {
          targetIndex = 0;
        } else {
          const targetStepNum = parseInt(match[3] || '');
          if (!isNaN(targetStepNum)) {
            if (targetStepNum > 0 && targetStepNum <= orderedSteps.length) {
              targetIndex = targetStepNum - 1;
            } else {
              toast.error(`Target step ${targetStepNum} doesn't exist (valid range: 1-${orderedSteps.length})`);
              return false;
            }
          }
        }
        
        // Enhanced direction detection with more variations
        const directionWord = match[2].toLowerCase();
        const isAfter = directionWord === 'after' || 
                       directionWord === 'below' || 
                       directionWord === 'next to' || 
                       directionWord === 'under';
        
        if (
          sourceIndex >= 0 && sourceIndex < orderedSteps.length &&
          targetIndex >= 0 && targetIndex < orderedSteps.length &&
          sourceIndex !== targetIndex
        ) {
          handleStepReorder(sourceIndex, targetIndex, isAfter);
          toast.success(`Moving step ${sourceIndex + 1} ${isAfter ? 'after' : 'before'} step ${targetIndex + 1}`);
          return true;
        } else {
          if (sourceIndex < 0) {
            toast.error("Couldn't determine which step to move");
          } else if (targetIndex < 0) {
            toast.error("Couldn't determine where to move the step");
          } else {
            toast.error('Invalid step positions for moving');
          }
          return false;
        }
      }
    } else if (nextStepPattern.test(normalizedCommand) || fuzzyMatch(normalizedCommand, ['next', 'go on'])) {
      // Handle going to next step with better recognition and feedback
      const currentIndex = currentStep ? orderedSteps.findIndex(s => s._id === currentStep._id) : -1;
      
      if (orderedSteps.length === 0) {
        toast.error('No steps available');
        return false;
      }
      
      if (currentIndex === -1) {
        // If no current step is selected, select the first one
        if (orderedSteps.length > 0) {
          setCurrentStep(orderedSteps[0]);
          toast.success('Starting with the first step');
          return true;
        }
      } else if (currentIndex < orderedSteps.length - 1) {
        // Move to the next step
        const nextStep = orderedSteps[currentIndex + 1];
        setCurrentStep(nextStep);
        toast.success(`Moving to step ${currentIndex + 2}: "${nextStep.instruction.substring(0, 20)}${nextStep.instruction.length > 20 ? '...' : ''}"`);
        
        // Highlight the next step (would need UI implementation)
        // This could be replaced with scrolling to the step
        return true;
      } else {
        toast.info('Already at the last step');
        return true;
      }
    } else if (previousStepPattern.test(normalizedCommand) || fuzzyMatch(normalizedCommand, ['go back', 'previous'])) {
      // Handle going to previous step with improved handling
      const currentIndex = currentStep ? orderedSteps.findIndex(s => s._id === currentStep._id) : -1;
      
      if (orderedSteps.length === 0) {
        toast.error('No steps available');
        return false;
      }
      
      if (currentIndex === -1) {
        // If no step is selected, select first one
        if (orderedSteps.length > 0) {
          setCurrentStep(orderedSteps[0]);
          toast.info('Starting with the first step');
          return true;
        }
      } else if (currentIndex > 0) {
        // Move to previous step
        const prevStep = orderedSteps[currentIndex - 1];
        setCurrentStep(prevStep);
        toast.success(`Moving to step ${currentIndex}: "${prevStep.instruction.substring(0, 20)}${prevStep.instruction.length > 20 ? '...' : ''}"`);
        return true;
      } else {
        toast.info('Already at the first step');
        return true;
      }
    // Help command to guide users
    } else if (fuzzyMatch(normalizedCommand, ['help', 'commands', 'what can i say', 'show commands', 'available commands'])) {
      toast.success(
        "Available commands:\n" +
        "• Add step [content] - Creates a new step\n" +
        "• Add material [content] - Adds a new material\n" +
        "• Delete step [number/last] - Removes a step\n" +
        "• Next / Previous - Navigate between steps\n" +
        "• Move step [number] before/after step [number]\n", 
        { duration: 8000 }
      );
      return true;
    } else {
      // Handle unrecognized commands with better feedback
      
      // Clear any existing timeout
      if (commandTimeout) {
        clearTimeout(commandTimeout);
      }
      
      // Set a timeout to allow for pauses in speech recognition
      const timeoutId = setTimeout(() => {
        // After a short delay, provide helpful feedback for unrecognized commands
        toast.info(
          `Command not recognized: "${command}"\nTry saying: "add step...", "help", or "next"`, 
          { duration: 5000 }
        );
      }, 1500); // 1.5 second delay to allow for continued speech
      
      setCommandTimeout(timeoutId);
      return false;
    }
    
    // Clean up any timeouts when function exits
    if (commandTimeout) {
      clearTimeout(commandTimeout);
    }
    
    return false; // Default return value if no command was fully processed
  };

  // Toggle voice command listening with enhanced feedback
  const toggleVoiceCommands = () => {
    if (!speechRecognition) {
      toast.error('Voice recognition not supported in your browser');
      return;
    }
    
    try {
      if (isListening) {
        speechRecognition.stop();
        toast.info('Voice commands stopped');
      } else {
        // Clear any existing voice command
        setVoiceCommand('');
        // Clear any existing timeout
        if (commandTimeout) {
          clearTimeout(commandTimeout);
          setCommandTimeout(null);
        }
        
        speechRecognition.start();
        setIsListening(true);
        toast.success('Voice commands activated. Try saying "add step", "next", or "help"');
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      toast.error('Failed to start voice recognition. Please try again.');
    }
  };

  // Handle drag start
  const handleDragStart = (step: Step) => {
    setDraggedStep(step);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedStep) return;
    
    const draggedOverStep = orderedSteps[index];
    
    // Don't replace items with themselves
    if (draggedStep._id === draggedOverStep._id) return;
    
    // Reorder the steps
    const items = [...orderedSteps];
    const draggedItemIndex = items.findIndex(item => item._id === draggedStep._id);
    items.splice(draggedItemIndex, 1);
    items.splice(index, 0, draggedStep);
    
    // Update the order indices
    const updatedItems = items.map((item, idx) => ({
      ...item,
      orderIndex: idx
    }));
    
    setOrderedSteps(updatedItems);
    needsReordering.current = true;
  };

  // Handle drag end - save the new order
  const handleDragEnd = async () => {
    setDraggedStep(null);
    
    if (needsReordering.current) {
      try {
        // Prepare the order updates
        const updates = orderedSteps.map((step, index) => ({
          id: step._id,
          orderIndex: index
        }));
        
        // Update in the database
        await updateStepOrder({ sopId, updates });
        toast.success('Step order updated');
      } catch (error) {
        toast.error('Failed to update step order');
        console.error('Error updating step order:', error);
      }
      
      needsReordering.current = false;
    }
  };
  
  // Function to handle step selection - keeps track of current step for voice commands
  const handleStepSelect = (step: Step) => {
    setCurrentStep(step);
    // Optional: highlight the selected step in the UI
  };

  // Handle step reordering from voice commands
  const handleStepReorder = (sourceIndex: number, targetIndex: number, after = false) => {
    const items = [...orderedSteps];
    const [movedItem] = items.splice(sourceIndex, 1);
    
    // If "after", we need to insert after the target index
    const adjustedTargetIndex = after ? targetIndex + 1 : targetIndex;
    
    items.splice(adjustedTargetIndex, 0, movedItem);
    
    // Update the order indices
    const updatedItems = items.map((item, idx) => ({
      ...item,
      orderIndex: idx
    }));
    
    setOrderedSteps(updatedItems);
    needsReordering.current = true;
    
    // Save the new order
    handleDragEnd();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Steps</h3>
        <button
          onClick={toggleVoiceCommands}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'} dark:bg-opacity-80`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              Stop Listening
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Voice Commands
            </>
          )}
        </button>
      </div>
      
      {isListening && (
        <div className="bg-indigo-50 p-3 rounded-md mb-4 dark:bg-indigo-900 dark:bg-opacity-20">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <span className="font-medium">Listening:</span> {voiceCommand || 'Say a command...'}
          </p>
          <p className="text-xs text-indigo-600 mt-1 dark:text-indigo-400">
            Try: "add step [instruction]", "delete step [number]", or "move step [number] before/after step [number]"
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        {orderedSteps.map((step, index) => (
          <div
              key={step._id}
              draggable
              onDragStart={() => handleDragStart(step)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleStepSelect(step)}
              className={`bg-white rounded-lg p-4 shadow-sm cursor-move border-2 ${draggedStep?._id === step._id ? 'border-indigo-300 opacity-50' : 'border-transparent'} dark:bg-gray-800 dark:text-white relative`}
            >
              {currentStep && currentStep._id === step._id && (
                <div className="absolute h-full w-1 bg-green-500 left-0 top-0 rounded-l-lg" aria-label="Current step"></div>
              )}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center dark:bg-indigo-900">
                <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300">{step.instruction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onEdit(step)}
                    className="text-blue-500 hover:text-blue-600 text-sm dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(step._id)}
                    className="text-red-500 hover:text-red-600 text-sm dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => onAddMedia(step._id, "image")}
                    className="text-indigo-500 hover:text-indigo-600 text-sm dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Add Image
                  </button>
                  <button
                    onClick={() => onAddMedia(step._id, "video")}
                    className="text-indigo-500 hover:text-indigo-600 text-sm dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Add Video
                  </button>
                </div>
                {step.imageId && (
                  <StepMedia type="image" storageId={step.imageId} />
                )}
                {step.videoId && (
                  <StepMedia type="video" storageId={step.videoId} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {orderedSteps.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No steps added yet. Add your first step above.</p>
        </div>
      )}
    </div>
  );
}