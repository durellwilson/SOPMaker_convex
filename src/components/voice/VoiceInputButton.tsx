import React, { useState, useEffect } from 'react';
import { VoiceInputService } from '../../services/VoiceInputService';
import { toast } from 'sonner';
import '../../styles/voiceAnimations.css';

type VoiceInputButtonProps = {
  fieldType: 'title' | 'description' | 'materials' | 'step';
  onTextCaptured: (text: string) => void;
  initialText?: string;
  className?: string;
  buttonText?: string;
};

/**
 * VoiceInputButton provides a button that enables voice input for SOP content
 * When clicked, it starts listening for speech and converts it to text
 */
export function VoiceInputButton({
  fieldType,
  onTextCaptured,
  initialText = '',
  className = '',
  buttonText
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [capturedText, setCapturedText] = useState(initialText);
  
  // Handle real-time text updates during dictation
  const handleTextCapture = (text: string) => {
    setCapturedText(text);
    
    // Format the text based on field type
    let formattedText = text;
    if (fieldType === 'materials') {
      formattedText = VoiceInputService.formatMaterialsList(text);
    } else if (fieldType === 'step') {
      formattedText = VoiceInputService.formatStepInstruction(text);
    }
    
    // Pass the formatted text to the parent component
    onTextCaptured(formattedText);
  };
  
  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      VoiceInputService.stopListening();
      setIsListening(false);
    } else {
      const success = VoiceInputService.startListening(fieldType, handleTextCapture);
      setIsListening(success);
      
      if (!success) {
        toast.error('Could not start voice input. Please check your microphone permissions.');
      }
    }
  };
  
  // Sync listening state with service
  useEffect(() => {
    const checkListeningState = () => {
      const serviceIsListening = VoiceInputService.isCurrentlyListening();
      const serviceTargetField = VoiceInputService.getCurrentTargetField();
      
      // Update our state if it doesn't match the service state
      // or if the service is listening to a different field
      if (isListening !== serviceIsListening || 
          (serviceIsListening && serviceTargetField !== fieldType)) {
        setIsListening(serviceIsListening && serviceTargetField === fieldType);
      }
    };
    
    // Check state periodically
    const interval = setInterval(checkListeningState, 500);
    return () => clearInterval(interval);
  }, [isListening, fieldType]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // If we're listening to this field when unmounting, stop listening
      if (isListening && 
          VoiceInputService.isCurrentlyListening() && 
          VoiceInputService.getCurrentTargetField() === fieldType) {
        VoiceInputService.stopListening();
      }
    };
  }, [isListening, fieldType]);
  
  // Determine button text based on field type and state
  const getButtonText = () => {
    if (buttonText) return buttonText;
    
    if (isListening) {
      return 'Stop Dictation';
    }
    
    switch (fieldType) {
      case 'title':
        return 'Dictate Title';
      case 'description':
        return 'Dictate Description';
      case 'materials':
        return 'Dictate Materials';
      case 'step':
        return 'Dictate Step';
      default:
        return 'Dictate';
    }
  };
  
  return (
    <button
      onClick={toggleVoiceInput}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors 
        ${isListening 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800'}
        ${className}`}
      aria-label={`${isListening ? 'Stop' : 'Start'} voice input for ${fieldType}`}
      title={`${isListening ? 'Stop' : 'Start'} voice input for ${fieldType}`}
    >
      {/* Microphone icon with animation */}
      <span className={`relative inline-flex`}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-5 h-5"
        >
          <path 
            fillRule="evenodd" 
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
            clipRule="evenodd" 
          />
        </svg>
        
        {/* Animated rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping-slow opacity-75 bg-red-400"></span>
            <span className="absolute inset-0 rounded-full animate-ping-slower opacity-50 bg-red-300"></span>
          </>
        )}
      </span>
      
      {getButtonText()}
    </button>
  );
}