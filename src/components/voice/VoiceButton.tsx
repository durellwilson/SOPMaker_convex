import React from 'react';
import { VoiceInputService } from '../../services/VoiceInputService';

interface VoiceButtonProps {
  targetField: 'title' | 'description' | 'materials' | 'step';
  onTextCapture: (text: string) => void;
  isActive?: boolean;
  className?: string;
  buttonText?: string;
}

/**
 * A unified voice input button component that uses the VoiceInputService
 * This ensures consistent behavior across all voice input buttons in the application
 */
export function VoiceButton({
  targetField,
  onTextCapture,
  isActive = false,
  className = '',
  buttonText = 'Voice Input'
}: VoiceButtonProps) {
  const isRecording = isActive || VoiceInputService.isRecognitionActive() && 
                     VoiceInputService.getCurrentTargetField() === targetField;

  const handleToggleVoice = () => {
    if (isRecording) {
      VoiceInputService.stopListening();
    } else {
      VoiceInputService.startListening(targetField, onTextCapture);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleVoice}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${className}`}
      aria-pressed={isRecording}
      title={isRecording ? `Stop recording ${targetField}` : `Record ${targetField} with voice`}
    >
      {/* Microphone icon */}
      <span className="relative inline-flex">
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

        {/* Animated rings when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full animate-ping-slow opacity-75 bg-white"></span>
        )}
      </span>

      {/* Button text */}
      <span>{buttonText}</span>
    </button>
  );
}