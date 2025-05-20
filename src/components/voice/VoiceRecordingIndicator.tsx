import React, { useEffect, useState } from 'react';
import { VoiceInputService } from '../../services/VoiceInputService';

/**
 * A persistent recording indicator component that shows when voice input is active
 * This component can be placed in the navigation bar or any persistent UI element
 */
export function VoiceRecordingIndicator() {
  const [isRecording, setIsRecording] = useState(false);
  const [targetField, setTargetField] = useState<string | null>(null);

  // Check recording status periodically
  useEffect(() => {
    const checkRecordingStatus = () => {
      const recording = VoiceInputService.isRecognitionActive();
      const field = VoiceInputService.getCurrentTargetField();
      
      setIsRecording(recording);
      setTargetField(field);
    };

    // Check immediately on mount
    checkRecordingStatus();
    
    // Then check every 500ms
    const interval = setInterval(checkRecordingStatus, 500);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, []);

  // Don't render anything if not recording
  if (!isRecording) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500 text-white text-sm animate-pulse">
      {/* Microphone icon with animation */}
      <span className="relative inline-flex">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-4 h-4"
        >
          <path 
            fillRule="evenodd" 
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
            clipRule="evenodd" 
          />
        </svg>
        
        {/* Animated rings */}
        <span className="absolute inset-0 rounded-full animate-ping-slow opacity-75 bg-white"></span>
      </span>
      
      {/* Show which field is being recorded */}
      <span>
        Recording {targetField || '...'}
      </span>
    </div>
  );
}