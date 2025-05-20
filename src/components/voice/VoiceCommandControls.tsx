import React, { useRef, useEffect } from 'react';
import { RecognitionStatus } from '../../types/material';
import { audioFeedback } from '../../utils/audioFeedback';


type VoiceCommandControlsProps = {
  isListening: boolean;
  continuousMode: boolean;
  recognitionStatus: RecognitionStatus;
  onToggleListening: () => void;
  onToggleContinuousMode: () => void;
};

/**
 * Component for rendering voice command control buttons
 */
export function VoiceCommandControls({
  isListening,
  continuousMode,
  recognitionStatus,
  onToggleListening,
  onToggleContinuousMode
}: VoiceCommandControlsProps) {
  const pulseRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Play subtle feedback when status changes
  useEffect(() => {
    if (recognitionStatus === 'success') {
      // Subtle success feedback
      if (buttonRef.current) {
        buttonRef.current.classList.add('success-flash');
        setTimeout(() => {
          if (buttonRef.current) buttonRef.current.classList.remove('success-flash');
        }, 500);
      }
    }
  }, [recognitionStatus]);

  return (
    <div className="flex gap-2 justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            onToggleContinuousMode();
            // Subtle feedback
            if (navigator.vibrate) {
              navigator.vibrate(30);
            }
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${continuousMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-400`}
          title={continuousMode ? "Continuous listening mode enabled" : "Single command mode"}
          aria-pressed={continuousMode}
          aria-label={continuousMode ? "Switch to single command mode" : "Switch to continuous listening mode"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {continuousMode ? "Continuous" : "Single"}
        </button>
      </div>
        
      <button
        ref={buttonRef}
        onClick={() => {
          onToggleListening();
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          // Play audio feedback
          if (!isListening) {
            audioFeedback.startListening();
          } else {
            audioFeedback.stopListening();
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'} dark:bg-opacity-90 relative shadow-md hover:shadow-lg transition-all duration-200`}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
      >
        {isListening ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Stop Listening
            <div 
              ref={pulseRef}
              className={`absolute inset-0 rounded-md opacity-30 -z-10 ${recognitionStatus === 'listening' ? 'animate-listening-pulse bg-red-400 dark:bg-red-700' : recognitionStatus === 'processing' ? 'animate-processing-pulse bg-yellow-400 dark:bg-yellow-700' : recognitionStatus === 'success' ? 'animate-success-pulse bg-green-400 dark:bg-green-700' : ''}`}
              style={{
                animation: recognitionStatus === 'listening' ? 'listening-pulse 1.5s ease-in-out infinite' : 
                         recognitionStatus === 'processing' ? 'processing-pulse 0.8s ease-in-out infinite' : 
                         recognitionStatus === 'success' ? 'success-pulse 0.5s ease-out' : ''
              }}
              aria-hidden="true"
            />
            <span className="sr-only">
              {recognitionStatus === 'listening' ? 'Currently listening' : 
               recognitionStatus === 'processing' ? 'Processing your command' : 
               recognitionStatus === 'success' ? 'Command successful' : 
               recognitionStatus === 'error' ? 'Command failed' : 'Voice command status'}
            </span>
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
  );
}