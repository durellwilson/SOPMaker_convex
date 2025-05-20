import { toast } from 'sonner';
import { audioFeedback } from '../utils/audioFeedback';

/**
 * Service for handling voice input functionality with proper state management and error handling
 * Provides a centralized system for voice recognition across the application
 */
export class VoiceInputService {
  // Core recognition properties
  private static recognition: SpeechRecognition | null = null;
  private static synth = window.speechSynthesis;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  
  // State management
  private static isListening: boolean = false;
  private static isInitialized: boolean = false;
  private static interimResults: string = '';
  private static finalResults: string = '';
  private static targetField: 'title' | 'description' | 'materials' | 'step' | null = null;
  private static currentCallback: ((text: string) => void) | null = null;
  private static recordingStartTime: number = 0; // Track when recording started for resource management
  
  // Timers and activity tracking
  private static timeout: ReturnType<typeof setTimeout> | null = null;
  private static processingTimeout: ReturnType<typeof setTimeout> | null = null;
  private static autoStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private static lastActivityTimestamp: number = 0;
  
  // Error recovery configuration
  private static retryCount: number = 0;
  private static readonly maxRetries: number = 5;
  private static readonly retryDelay: number = 1500;
  private static readonly maxSilenceDuration: number = 10000;
  private static readonly maxListeningDuration: number = 60000;
  private static readonly restartDelay: number = 500;
  private static backoffFactor: number = 1.5;

  /**
   * Check if speech recognition is currently active
   * @returns boolean indicating if recognition is active
   */
  static isRecognitionActive(): boolean {
    return this.isListening;
  }
  
  /**
   * Get the current target field being recorded
   * @returns string indicating which field is being recorded, or null if not recording
   */
  static getCurrentTargetField(): string | null {
    return this.targetField;
  }
  
  /**
   * Check if the service is currently listening
   * @returns boolean indicating if the service is listening
   */
  static isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Initialize the speech recognition service
   * @returns boolean indicating if speech recognition is supported
   */
  static initialize(): boolean {
    // If already initialized and in good state, don't reinitialize
    if (this.isInitialized && this.recognition) {
      return true;
    }
    
    // Check for standard SpeechRecognition first, then fallback to webkit prefix
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser');
      return false;
    }
    
    // Always clean up existing recognition instance to ensure clean state
    this.cleanupRecognition();
    
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      // Add advanced configuration for better recognition
      if ('maxAlternatives' in this.recognition) {
        this.recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
      }
      
      this.setupRecognitionHandlers();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      toast.error('Failed to initialize speech recognition');
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Start listening for speech input for a specific field
   * @param targetField The type of field being dictated
   * @param callback Function to call with the recognized text
   * @returns boolean indicating if listening started successfully
   */
  static startListening(
    targetField: 'title' | 'description' | 'materials' | 'step',
    callback: (text: string) => void
  ): boolean {
    // If already listening to the same field, don't restart
    if (this.isListening && this.targetField === targetField) {
      return true;
    }
    
    // If listening to a different field, stop first
    if (this.isListening) {
      this.stopListening();
    }
    
    // Initialize recognition engine
    if (!this.initialize()) {
      toast.error('Could not initialize speech recognition');
      return false;
    }
    
    // Set up state for new listening session
    this.targetField = targetField;
    this.currentCallback = callback;
    this.lastActivityTimestamp = Date.now();
    this.interimResults = '';
    this.finalResults = '';
    this.retryCount = 0;
    this.backoffFactor = 1.5;
    
    try {
      // Provide immediate visual feedback
      toast.info(`Listening for ${targetField}...`, {
        duration: 1500,
        position: 'bottom-right'
      });
      
      // Play audio feedback
      audioFeedback.startListening();
      
      // Start recognition with a small delay to ensure UI is ready
      setTimeout(() => {
        try {
          this.recognition?.start();
          this.isListening = true;
          
          // Set up auto-stop timeout for long recordings
          this.setupAutoStopTimeout();
          
          return true;
        } catch (error) {
          // Handle already started error gracefully
          if (error instanceof DOMException && error.name === 'InvalidStateError') {
            console.log('Recognition already started, resetting and trying again');
            this.cleanupRecognition();
            this.initialize();
            
            setTimeout(() => {
              try {
                this.recognition?.start();
                this.isListening = true;
                this.setupAutoStopTimeout();
              } catch (retryError) {
                console.error('Error on retry starting speech recognition:', retryError);
                toast.error('Failed to start voice input after retry');
                this.isListening = false;
                return false;
              }
            }, 100);
          } else {
            console.error('Error starting speech recognition:', error);
            toast.error('Failed to start voice input');
            this.isListening = false;
            return false;
          }
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error in startListening:', error);
      toast.error('Failed to start voice input');
      this.isListening = false;
      return false;
    }
  }
  
  /**
   * Set up auto-stop timeout to prevent indefinite listening
   */
  private static setupAutoStopTimeout(): void {
    // Clear any existing timeout
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
    }
    
    // Set new timeout
    this.autoStopTimeout = setTimeout(() => {
      if (this.isListening) {
        toast.info('Voice input timed out after inactivity', {
          duration: 3000,
          position: 'bottom-right'
        });
        this.stopListening();
      }
    }, this.maxListeningDuration);
  }

  /**
   * Stop listening for speech input and clean up resources
   * @returns boolean indicating if stopping was successful
   */
  static stopListening(): boolean {
    // Clear all timeouts first to prevent any pending operations
    this.clearTimeouts();
    
    // If we're not actually listening, just reset state
    if (!this.isListening || !this.recognition) {
      this.resetState();
      return true;
    }
    
    try {
      // Stop the recognition engine
      this.recognition.stop();
      
      // Play audio feedback
      audioFeedback.stopListening();
      
      // Provide visual feedback
      toast.info(`Voice input for ${this.targetField || 'field'} stopped`, {
        duration: 2000,
        position: 'bottom-right'
      });
      
      // Reset state
      this.resetState();
      return true;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      
      // Even if there's an error, we should reset our state
      this.resetState();
      return false;
    }
  }
  
  /**
   * Reset all state variables to their default values
   */
  private static resetState(): void {
    this.isListening = false;
    this.interimResults = '';
    this.finalResults = '';
    this.activeUtterance = null;
    this.retryCount = 0;
    
    // Don't clear targetField and currentCallback immediately
    // to allow for proper cleanup and final result processing
    setTimeout(() => {
      this.targetField = null;
      this.currentCallback = null;
    }, 500);
  }
  
  /**
   * Restart the speech recognition service
   * This method can be called when recognition is in an error state
   * @returns boolean indicating if restart was successful
   */
  static restartRecognition(): boolean {
    console.log('Attempting to restart speech recognition...');
    
    // First, clean up existing recognition
    this.cleanupRecognition();
    
    // Then initialize a new recognition instance
    if (!this.initialize()) {
      toast.error('Failed to restart speech recognition');
      return false;
    }
    
    // If we had a callback and target field, restart listening
    if (this.currentCallback && this.targetField) {
      try {
        this.startListening(this.targetField, this.currentCallback);
        toast.success('Voice recognition restarted successfully');
        return true;
      } catch (error) {
        console.error('Error restarting speech recognition:', error);
        toast.error('Failed to restart voice recognition');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Stop all voice input and speech synthesis
   */
  static stopAll(): void {
    this.stopListening();
    this.synth.cancel();
  }

  /**
   * Format a materials list with bullet points
   * @param input Raw materials list text
   * @returns Formatted materials list with bullet points
   */
  static formatMaterialsList(input: string): string {
    if (!input.trim()) return '';
    return input
      .split('\n')
      .filter(line => line.trim())
      .map(line => `• ${line.replace(/^[•*\-–]\s+/, '').trim()}`)
      .join('\n');
  }
  
  /**
   * Format a step instruction with proper formatting
   * @param input Raw step instruction text
   * @returns Formatted step instruction
   */
  static formatStepInstruction(input: string): string {
    if (!input.trim()) return '';
    // Capitalize first letter of the instruction
    return input.charAt(0).toUpperCase() + input.slice(1);
  }
  
  /**
   * Normalize speech recognition results to handle common misrecognitions
   * @param text Raw text from speech recognition
   * @returns Normalized text with common speech recognition errors fixed
   */
  static normalizeRecognitionResult(text: string): string {
    if (!text) return '';
    
    // Common speech recognition errors and their corrections
    const corrections: [RegExp, string][] = [
      // Punctuation and formatting
      [/\bnew line\b/gi, '\n'],
      [/\bnewline\b/gi, '\n'],
      [/\bcomma\b/gi, ','],
      [/\bperiod\b/gi, '.'],
      [/\bquestion mark\b/gi, '?'],
      [/\bexclamation\b/gi, '!'],
      [/\bexclamation point\b/gi, '!'],
      [/\bcolon\b/gi, ':'],
      [/\bsemicolon\b/gi, ';'],
      
      // SOP pronunciation corrections - enhanced to catch more variations
      [/\bsahp\b/gi, 'SOP'],
      [/\bsop\b/gi, 'SOP'],
      [/\bs\.o\.p\b/gi, 'SOP'],
      [/\bs o p\b/gi, 'SOP'],
      [/\bs-o-p\b/gi, 'SOP'],
      [/\bsahps\b/gi, 'SOPs'],
      [/\bsops\b/gi, 'SOPs'],
      [/\bstandard operating procedure\b/gi, 'SOP'],
      [/\bstandard operating procedures\b/gi, 'SOPs'],
      
      // Common command words that get misrecognized
      [/\badd step\b/gi, 'add step'],
      [/\bad step\b/gi, 'add step'],
      [/\bat step\b/gi, 'add step'],
      [/\band step\b/gi, 'add step'],
      
      [/\badd material\b/gi, 'add material'],
      [/\bad material\b/gi, 'add material'],
      [/\bat material\b/gi, 'add material'],
      [/\band material\b/gi, 'add material'],
      
      [/\bdelete step\b/gi, 'delete step'],
      [/\bremove step\b/gi, 'delete step'],
      [/\bdel step\b/gi, 'delete step'],
      
      [/\bnext\b/gi, 'next'],
      [/\bnext step\b/gi, 'next step'],
      [/\bcontinue\b/gi, 'next step'],
      [/\bgo next\b/gi, 'next step'],
      
      [/\bprevious\b/gi, 'previous'],
      [/\bprevious step\b/gi, 'previous step'],
      [/\bgo back\b/gi, 'previous step'],
      [/\bback\b/gi, 'previous step']
    ];
    
    // Apply all corrections
    let normalizedText = text;
    for (const [pattern, replacement] of corrections) {
      normalizedText = normalizedText.replace(pattern, replacement);
    }
    
    return normalizedText;
  }

  /**
   * Speak text using speech synthesis with improved voice selection
   * @param text Text to speak
   * @param onEnd Optional callback to execute when speech ends
   * @param options Optional configuration for speech (rate, pitch)
   */
  static speak(text: string, onEnd?: () => void, options?: { rate?: number; pitch?: number }): void {
    this.stopAll();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a high-quality voice with better preference order
    const preferredVoices = [
      'Google US English',
      'Microsoft Zira',
      'Microsoft David',
      'Samantha',
      'Alex'
    ];
    
    // Get available voices
    let voices = this.synth.getVoices();
    
    // If voices array is empty, try to wait for voices to load
    if (voices.length === 0) {
      console.log('No voices available yet, waiting for voices to load...');
      // Show feedback to user
      toast.info('Preparing voice system...', { duration: 1500 });
      
      // Set a timeout to try again in 100ms
      setTimeout(() => {
        voices = this.synth.getVoices();
        this.setVoiceAndSpeak(utterance, voices, preferredVoices, text, options, onEnd);
      }, 100);
      return;
    }
    
    this.setVoiceAndSpeak(utterance, voices, preferredVoices, text, options, onEnd);
  }
  
  /**
   * Helper method to set voice properties and speak
   * @private
   */
  private static setVoiceAndSpeak(
    utterance: SpeechSynthesisUtterance,
    voices: SpeechSynthesisVoice[],
    preferredVoices: string[],
    text: string,
    options?: { rate?: number; pitch?: number },
    onEnd?: () => void
  ): void {
    // Try to find a preferred voice
    let selectedVoice = null;
    for (const voiceName of preferredVoices) {
      const voice = voices.find(v => v.name === voiceName || v.name.includes(voiceName));
      if (voice) {
        selectedVoice = voice;
        break;
      }
    }
    
    // If no preferred voice found, try to find any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en-')) || voices[0] || null;
    }
    
    utterance.voice = selectedVoice;
    utterance.rate = options?.rate || 1.1;
    utterance.pitch = options?.pitch || 1;

    if (onEnd) {
      utterance.onend = onEnd;
    }
    
    // Add error handling for speech synthesis
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      toast.error('Error speaking text');
      if (onEnd) onEnd();
    };

    this.activeUtterance = utterance;
    this.synth.speak(utterance);
    
    // Log for debugging
    console.log(`Speaking with voice: ${utterance.voice?.name || 'default'}, rate: ${utterance.rate}`);
  }
  
  /**
   * Clean up the recognition instance and associated resources
   * This method ensures proper release of microphone resources
   */
  private static cleanupRecognition(): void {
    if (this.recognition) {
      try {
        // Stop the recognition to release microphone
        if (this.isListening) {
          this.recognition.stop();
        }
        
        // Remove all event listeners to prevent memory leaks
        if (this.recognition.onresult) this.recognition.onresult = null;
        if (this.recognition.onerror) this.recognition.onerror = null;
        if (this.recognition.onend) this.recognition.onend = null;
        if (this.recognition.onstart) this.recognition.onstart = null;
        if (this.recognition.onspeechstart) this.recognition.onspeechstart = null;
        if (this.recognition.onspeechend) this.recognition.onspeechend = null;
        if (this.recognition.onnomatch) this.recognition.onnomatch = null;
      } catch (error) {
        // Ignore errors during cleanup
        console.log('Error during recognition cleanup:', error);
      }
      
      // Set to null to allow garbage collection
      this.recognition = null;
      this.isInitialized = false;
    }
    
    this.clearTimeouts();
    this.resetState();
  }
  
  /**
   * Stop all voice input activity and release resources
   * This is a global method that can be called from anywhere to ensure
   * all voice input is properly stopped
   */
  static stopAll(): void {
    // Stop any active speech synthesis
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    
    // Stop any active recognition
    this.stopListening();
    
    // Clean up recognition completely
    this.cleanupRecognition();
    
    // Reset all state
    this.resetState();
    this.targetField = null;
    this.currentCallback = null;
    
    // Log resource usage for debugging
    if (this.recordingStartTime > 0) {
      const recordingDuration = Date.now() - this.recordingStartTime;
      console.log(`Voice recording session lasted: ${recordingDuration / 1000} seconds`);
      this.recordingStartTime = 0;
    }
    
    // Provide feedback
    toast.info('All voice input stopped', {
      duration: 2000,
      position: 'bottom-right'
    });
  }

  /**
   * Clear all timeouts to prevent memory leaks
   */
  private static clearTimeouts(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
  }

  /**
   * Reset all state variables to their initial values
   */
  private static resetState(): void {
    this.isListening = false;
    this.currentCallback = null;
    this.interimResults = '';
    this.finalResults = '';
    this.targetField = null;
    this.lastActivityTimestamp = 0;
    this.retryCount = 0;
    this.backoffFactor = 1.5; // Reset backoff factor to initial value
    
    // Log resource usage for debugging if we haven't already in stopAll
    if (this.recordingStartTime > 0) {
      const recordingDuration = Date.now() - this.recordingStartTime;
      console.log(`Voice recording session lasted: ${recordingDuration / 1000} seconds`);
      this.recordingStartTime = 0;
    }
  }
  
  /**
   * Check if the browser supports speech recognition
   * @returns boolean indicating if speech recognition is supported
   */
  static isSpeechRecognitionSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  
  /**
   * Get the current recognition state
   * @returns string indicating the current state of recognition
   */
  static getRecognitionState(): string {
    if (!this.recognition) return 'uninitialized';
    try {
      return this.recognition.state || 'unknown';
    } catch (error) {
      console.error('Error getting recognition state:', error);
      return 'error';
    }
  }
  
  /**
   * Get the current recording duration in milliseconds
   * @returns number indicating how long the current recording session has been active
   */
  static getRecordingDuration(): number {
    if (!this.isListening || this.recordingStartTime === 0) return 0;
    return Date.now() - this.recordingStartTime;
  }
  
  /**
   * Set up event handlers for the speech recognition service
   */
  private static setupRecognitionHandlers(): void {
    if (!this.recognition) return;
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.lastActivityTimestamp = Date.now();
      this.recordingStartTime = Date.now(); // Track when recording started
      this.retryCount = 0; // Reset retry count on successful start
      audioFeedback.startListening();
      toast.info(`Listening for ${this.targetField} input...`, {
        duration: 2000,
        position: 'bottom-right'
      });
      
      // Set auto-stop timeout with a more generous duration
      this.clearTimeouts();
      this.autoStopTimeout = window.setTimeout(() => {
        if (this.isListening) {
          const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp;
          if (timeSinceLastActivity >= this.maxSilenceDuration) {
            toast.info('Voice input completed due to inactivity', {
              duration: 2000,
              position: 'bottom-right'
            });
            this.stopListening();
          }
        }
      }, this.maxListeningDuration);
    };
    
    this.recognition.onresult = (event) => {
      // Update last activity timestamp to prevent auto-stop during active speech
      this.lastActivityTimestamp = Date.now();
      this.retryCount = 0; // Reset retry count on successful result
      
      try {
        // Safely access results with defensive programming to prevent TypeError
        if (!event || !event.results) {
          console.error('Speech recognition event missing expected structure:', event);
          return;
        }
        
        // Process all results, not just the latest one
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Safely check if the result and its first alternative exist
          if (!event.results[i] || !event.results[i][0]) {
            console.warn('Missing result or alternative at index', i);
            continue;
          }
          
          const transcript = event.results[i][0].transcript;
          
          // Track confidence level for debugging and potential UI feedback
          if (event.results[i][0].confidence) {
            confidence = Math.max(confidence, event.results[i][0].confidence);
          }
          
          if (event.results[i].isFinal) {
            // Normalize final transcript to handle common misrecognitions
            const normalizedTranscript = this.normalizeRecognitionResult(transcript);
            finalTranscript += normalizedTranscript;
            
            // Log for debugging
            if (normalizedTranscript !== transcript) {
              console.log(`Normalized: "${transcript}" → "${normalizedTranscript}"`);
            }
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update our state
        this.interimResults = interimTranscript;
        
        if (finalTranscript) {
          this.finalResults += ' ' + finalTranscript.trim();
          this.finalResults = this.finalResults.trim();
          
          // Provide audio feedback for captured text
          audioFeedback.commandSuccess();
          
          // Log confidence for debugging
          console.log(`Speech recognition confidence: ${(confidence * 100).toFixed(1)}%`);
          
          // Provide visual feedback based on confidence
          if (confidence > 0.8) {
            // High confidence - no additional feedback needed
          } else if (confidence > 0.5) {
            // Medium confidence
            toast.info('I heard you, but I might not have understood perfectly', {
              duration: 1500,
              position: 'bottom-right'
            });
          } else if (confidence > 0) {
            // Low confidence
            toast.info('I had trouble understanding you. Please speak clearly.', {
              duration: 2000,
              position: 'bottom-right'
            });
          }
          
          // Reset silence detection timeout
          this.clearTimeouts();
          this.processingTimeout = window.setTimeout(() => {
            const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp;
            if (timeSinceLastActivity >= this.maxSilenceDuration) {
              toast.info('Voice input completed due to inactivity', {
                duration: 2000,
                position: 'bottom-right'
              });
              this.stopListening();
            }
          }, this.maxSilenceDuration);
        }
        
        // Notify UI of interim results if needed
        if (this.currentCallback && (this.interimResults || this.finalResults)) {
          // Combine final and interim for real-time feedback
          const combinedText = (this.finalResults + ' ' + this.interimResults).trim();
          this.currentCallback(combinedText);
        }
      } catch (error) {
        console.error('Error processing speech recognition result:', error);
        toast.error('Error processing voice input');
        
        // Try to recover from errors
        this.lastActivityTimestamp = Date.now(); // Prevent auto-stop during error recovery
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle different error types with appropriate recovery strategies
      switch (event.error) {
        case 'no-speech':
          // No speech detected - this is common and shouldn't alarm the user
          console.log('No speech detected, will retry automatically');
          
          // Only show a toast if we've had multiple no-speech errors
          if (this.retryCount > 2) {
            toast.info('No speech detected. Please speak clearly or try again.', {
              duration: 2000,
              position: 'bottom-right'
            });
          }
          
          // Try to restart recognition with exponential backoff
          if (this.isListening && this.retryCount < this.maxRetries) {
            this.retryCount++;
            // Calculate backoff delay with jitter to prevent synchronized retries
            const jitter = Math.random() * 500; // Random jitter between 0-500ms
            const backoffDelay = this.retryDelay * Math.pow(this.backoffFactor, this.retryCount - 1) + jitter;
            
            console.log(`Retry ${this.retryCount}/${this.maxRetries} in ${backoffDelay}ms`);
            
            setTimeout(() => {
              if (this.isListening && this.recognition) {
                try {
                  this.recognition.start();
                  console.log(`Retry ${this.retryCount} started successfully`);
                } catch (error) {
                  console.error('Error restarting after no-speech:', error);
                  // If we can't restart, try to recreate the recognition object
                  if (error instanceof DOMException && error.name === 'InvalidStateError') {
                    console.log('Recognition in invalid state, recreating...');
                    this.cleanupRecognition();
                    this.initialize();
                    setTimeout(() => {
                      try {
                        this.recognition?.start();
                      } catch (innerError) {
                        console.error('Failed to restart after recreation:', innerError);
                      }
                    }, 100);
                  }
                }
              }
            }, backoffDelay);
            return; // Don't stop listening yet
          }
          break;
          
        case 'aborted':
          // Aborted can happen during normal operation, handle more gracefully
          console.log('Recognition aborted, will attempt to restart if still listening');
          
          // Try to restart after a short delay if we're still supposed to be listening
          if (this.isListening) {
            setTimeout(() => {
              if (this.isListening && this.recognition) {
                try {
                  this.recognition.start();
                  console.log('Successfully restarted after abort');
                } catch (error) {
                  console.error('Error restarting after abort:', error);
                  // If we can't restart, try to recreate the recognition object
                  if (error instanceof DOMException && error.name === 'InvalidStateError') {
                    this.cleanupRecognition();
                    this.initialize();
                    setTimeout(() => {
                      try {
                        this.recognition?.start();
                      } catch (innerError) {
                        console.error('Failed to restart after recreation:', innerError);
                        toast.error('Voice recognition failed to restart');
                        this.isListening = false;
                      }
                    }, 100);
                  }
                }
              }
            }, this.restartDelay);
            return; // Don't stop listening yet
          }
          break;
          
        case 'network':
          toast.error('Network error. Please check your connection.', {
            duration: 3000,
            position: 'bottom-right'
          });
          // Try to restart after network errors with a longer delay
          if (this.isListening && this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
              if (this.isListening && this.recognition) {
                try {
                  this.recognition.start();
                } catch (error) {
                  console.error('Error restarting after network error:', error);
                }
              }
            }, this.retryDelay * 2); // Longer delay for network issues
            return; // Don't stop listening yet
          }
          break;
          
        case 'not-allowed':
        case 'service-not-allowed':
          toast.error('Microphone access denied. Please enable microphone permissions.', {
            duration: 3000,
            position: 'bottom-right'
          });
          break;
          
        case 'audio-capture':
          toast.error('No microphone detected. Please connect a microphone and try again.', {
            duration: 3000,
            position: 'bottom-right'
          });
          break;
          
        default:
          // For other errors, show the error message and try to recover
          toast.error(`Voice recognition error: ${event.error}`, {
            duration: 3000,
            position: 'bottom-right'
          });
          audioFeedback.commandError();
          
          // For unknown errors, try to restart once
          if (this.isListening && this.retryCount === 0) {
            this.retryCount++;
            setTimeout(() => {
              if (this.isListening && this.recognition) {
                try {
                  this.recognition.start();
                } catch (error) {
                  console.error('Error restarting after unknown error:', error);
                }
              }
            }, this.retryDelay);
            return; // Try one restart before giving up
          }
      }
      
      // For errors other than no-speech and aborted, stop listening after recovery attempts
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.stopListening();
      }
    };
    
    this.recognition.onend = () => {
      console.log('Recognition ended, isListening:', this.isListening);
      
      // If we're still supposed to be listening, restart with improved error handling
      if (this.isListening) {
        try {
          // Add a delay before restarting to prevent rapid restart cycles
          // Use a longer delay if we've had multiple retries
          const currentDelay = this.retryCount > 1 ? 
            this.restartDelay * Math.min(this.retryCount, 3) : // Scale up to 3x for stability
            this.restartDelay;
          
          console.log(`Scheduling restart in ${currentDelay}ms (retry count: ${this.retryCount})`);
          
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                // Check if the recognition object is in a valid state
                if (this.recognition.state === 'inactive') {
                  this.recognition.start();
                  console.log('Recognition restarted after end event');
                } else {
                  // If not in inactive state, recreate the recognition object
                  console.log('Recognition in invalid state, recreating...');
                  this.cleanupRecognition();
                  if (this.initialize()) {
                    setTimeout(() => {
                      try {
                        this.recognition?.start();
                        console.log('Recognition restarted after recreation');
                      } catch (startError) {
                        console.error('Error starting recreated recognition:', startError);
                        this.isListening = false;
                        toast.error('Failed to restart voice recognition', {
                          duration: 2000,
                          position: 'bottom-right'
                        });
                      }
                    }, 100);
                  }
                }
              } catch (error) {
                console.error('Error restarting speech recognition:', error);
                
                // If we get an invalid state error, try to recreate the recognition object
                if (error instanceof DOMException && error.name === 'InvalidStateError') {
                  console.log('Recognition in invalid state, recreating...');
                  this.cleanupRecognition();
                  if (this.initialize()) {
                    setTimeout(() => {
                      try {
                        this.recognition?.start();
                        console.log('Recognition restarted after recreation');
                      } catch (startError) {
                        console.error('Error starting recreated recognition:', startError);
                        this.isListening = false;
                        toast.error('Failed to restart voice recognition', {
                          duration: 2000,
                          position: 'bottom-right'
                        });
                      }
                    }, 100);
                  }
                } else {
                  // For other errors, give up after too many retries
                  if (this.retryCount >= this.maxRetries) {
                    this.isListening = false;
                    toast.error('Voice recognition stopped after multiple failures', {
                      duration: 3000,
                      position: 'bottom-right'
                    });
                  } else {
                    // Increment retry count and try again with exponential backoff
                    this.retryCount++;
                    const backoffDelay = this.retryDelay * Math.pow(this.backoffFactor, this.retryCount - 1);
                    
                    setTimeout(() => {
                      if (this.isListening) {
                        this.cleanupRecognition();
                        if (this.initialize()) {
                          try {
                            this.recognition?.start();
                          } catch (retryError) {
                            console.error('Error on retry:', retryError);
                            this.isListening = false;
                          }
                        }
                      }
                    }, backoffDelay);
                  }
                }
              }
            }
          }, currentDelay);
        } catch (error) {
          console.error('Error in onend handler:', error);
          this.isListening = false;
          toast.error('Voice recognition encountered an error', {
            duration: 2000,
            position: 'bottom-right'
          });
        }
      } else {
        // Clean up properly when we're done listening
        this.isListening = false;
        
        // If we have final results, pass them to the callback one last time
        if (this.finalResults && this.currentCallback) {
          this.currentCallback(this.finalResults);
          toast.success(`${this.targetField} input captured`);
        }
      }
    };
    
    // Add onspeechstart and onspeechend handlers for better feedback
    this.recognition.onspeechstart = () => {
      this.lastActivityTimestamp = Date.now();
      // Visual feedback could be added here
    };
    
    this.recognition.onspeechend = () => {
      // Speech ended, but recognition might still be active
      this.lastActivityTimestamp = Date.now();
      // Reset silence detection timeout
      this.clearTimeouts();
      this.processingTimeout = window.setTimeout(() => {
        if (this.isListening) {
          const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp;
          if (timeSinceLastActivity >= this.maxSilenceDuration / 2) { // Use shorter timeout after speech ends
            this.stopListening();
          }
        }
      }, this.maxSilenceDuration / 2);
    };
    
    // Add nomatch handler for better error recovery
    this.recognition.onnomatch = () => {
      console.log('Speech was detected but not recognized');
      toast.info('Speech detected but not recognized. Please try again.', {
        duration: 2000,
        position: 'bottom-right'
      });
    };
  }
}