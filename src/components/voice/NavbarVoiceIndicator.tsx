import React, { useEffect, useState } from 'react';
import { VoiceInputService } from '../../services/VoiceInputService';

/**
 * A persistent recording indicator component that shows in the navigation bar
 * when voice input is active. This provides clear visual feedback to users
 * about the current recording state.
 */
export function NavbarVoiceIndicator() {
  const [isRecording, setIsRecording] = useState(false);
  const [targetField, setTargetField] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Check recording status periodically
  useEffect(() => {
    const checkRecordingStatus = () => {
      const recording = VoiceInputService.isRecognitionActive();
      const field = VoiceInputService.getCurrentTargetField();
      
      setIsRecording(recording);
      setTargetField(field);
      
      // Update duration if recording
      if (recording) {
        setRecordingDuration(prev => prev + 0.5); // Increment by 0.5 seconds
      } else {
        setRecordingDuration(0); // Reset when not recording
      }
    };

    // Check immediately on mount
    checkRecordingStatus();
    
    // Then check every 500ms
    const interval = setInterval(checkRecordingStatus, 500);
    
    // Clean up on unmount
    return () => {
      clearInterval(interval);
      // Ensure voice resources are released when component unmounts
      if (VoiceInputService.isRecognitionActive()) {
        VoiceInputService.stopAll();
      }
    };
  }, []);

  // Format recording duration as MM:SS
  const formatDuration = () => {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = Math.floor(recordingDuration % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
      
      {/* Show which field is being recorded and duration */}
      <span>
        Recording {targetField || '...'} ({formatDuration()})
      </span>
      
      {/* Stop button */}
      <button 
        onClick={() => VoiceInputService.stopAll()}
        className="ml-2 p-1 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Stop recording"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-3 h-3"
        >
          <rect width="12" height="12" x="4" y="4" rx="1" />
        </svg>
      </button>
    </div>
  );
}