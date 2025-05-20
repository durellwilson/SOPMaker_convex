/**
 * VoiceResourceManager
 * 
 * Utility class to monitor and manage voice input resources to prevent hardware abuse
 * and ensure proper cleanup of microphone access across the application.
 */

import { VoiceInputService } from '../services/VoiceInputService';

export class VoiceResourceManager {
  private static isMonitoring = false;
  private static monitorInterval: ReturnType<typeof setInterval> | null = null;
  private static maxContinuousRecordingTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  /**
   * Start monitoring voice input resources
   * This should be called when the application initializes
   */
  static startMonitoring(): void {
    if (this.isMonitoring) return;
    
    console.log('VoiceResourceManager: Starting resource monitoring');
    this.isMonitoring = true;
    
    // Check every 30 seconds for long-running voice sessions
    this.monitorInterval = setInterval(() => {
      this.checkVoiceResources();
    }, 30000);
    
    // Also set up event listeners for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * Stop monitoring voice input resources
   * This should be called when the application is shutting down
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('VoiceResourceManager: Stopping resource monitoring');
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * Check if voice resources are being used and enforce limits
   */
  private static checkVoiceResources(): void {
    if (VoiceInputService.isRecognitionActive()) {
      // Get the duration from the service
      const duration = VoiceInputService.getRecordingDuration();
      
      if (duration > this.maxContinuousRecordingTime) {
        console.warn(`VoiceResourceManager: Voice recording has been active for ${duration/1000} seconds, stopping to prevent resource abuse`);
        VoiceInputService.stopAll();
      }
    }
  }
  
  /**
   * Handle page visibility changes to stop recording when page is hidden
   */
  private static handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden' && VoiceInputService.isRecognitionActive()) {
      console.log('VoiceResourceManager: Page hidden, stopping voice recording');
      VoiceInputService.stopAll();
    }
  }
  
  /**
   * Handle page unload to ensure voice resources are released
   */
  private static handleBeforeUnload = (): void => {
    if (VoiceInputService.isRecognitionActive()) {
      console.log('VoiceResourceManager: Page unloading, stopping voice recording');
      VoiceInputService.stopAll();
    }
  }
}