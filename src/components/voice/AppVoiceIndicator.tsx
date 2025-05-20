import React, { useEffect, useState } from 'react';
import { VoiceInputService } from '../../services/VoiceInputService';
import { VoiceRecordingIndicator } from './VoiceRecordingIndicator';

/**
 * Main voice indicator component for the application
 * This component manages all voice-related indicators and ensures
 * proper resource management for voice input across the application
 */
export function AppVoiceIndicator() {
  const [isVisible, setIsVisible] = useState(false);

  // Monitor for any active voice input in the application
  useEffect(() => {
    const checkVoiceStatus = () => {
      const isActive = VoiceInputService.isRecognitionActive();
      setIsVisible(isActive);
    };

    // Check immediately and then periodically
    checkVoiceStatus();
    const interval = setInterval(checkVoiceStatus, 500);

    // Clean up on unmount
    return () => {
      clearInterval(interval);
      // Ensure voice resources are released when component unmounts
      if (VoiceInputService.isRecognitionActive()) {
        VoiceInputService.stopAll();
      }
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      {isVisible && <VoiceRecordingIndicator />}
    </div>
  );
}

/**
 * Instructions for using the AppVoiceIndicator:
 * 
 * 1. Add this component to your main App component or layout
 * 2. All voice recording buttons should use the VoiceInputService
 * 3. This indicator will automatically show when any voice recording is active
 * 4. The indicator will ensure proper resource cleanup when the app unmounts
 */