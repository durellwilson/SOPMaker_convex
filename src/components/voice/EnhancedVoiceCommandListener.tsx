import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SpeechRecognition, RecognitionStatus } from '../../types/material';
import { audioFeedback } from '../../utils/audioFeedback';
import { VoiceCommandHelp } from './VoiceCommandHelp';
import { CommandProcessor } from '../../utils/CommandProcessor';
import { AnimationService } from '../../services/AnimationService';

type EnhancedVoiceCommandListenerProps = {
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  continuousMode: boolean;
  onCommandReceived: (command: string) => boolean;
  onStatusChange?: (status: RecognitionStatus) => void;
  pauseTimeoutMs?: number;
};

/**
 * Enhanced component for handling voice command recognition
 * Features improved command recognition with fuzzy matching and feedback
 */
export function EnhancedVoiceCommandListener({
  isListening,
  setIsListening,
  continuousMode,
  onCommandReceived,
  onStatusChange,
  pauseTimeoutMs = 5000
}: EnhancedVoiceCommandListenerProps) {
  const [voiceCommand, setVoiceCommand] = useState('');
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');
  const [displayedCommand, setDisplayedCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [suggestedCommand, setSuggestedCommand] = useState<string | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  const [visualFeedback, setVisualFeedback] = useState<string>('');
  
  const processingTickRef = useRef<number | null>(null);
  const commandProcessorRef = useRef<CommandProcessor | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize command processor on mount
  useEffect(() => {
    commandProcessorRef.current = new CommandProcessor(pauseTimeoutMs);
    return () => {
      commandProcessorRef.current?.reset();
    };
  }, [pauseTimeoutMs]);
  
  // Update parent component with status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(recognitionStatus);
    }
    
    // Update visual feedback based on status
    switch(recognitionStatus) {
      case 'listening':
        setVisualFeedback('Listening to your voice...');
        break;
      case 'processing':
        setVisualFeedback('Processing your command...');
        break;
      case 'success':
        setVisualFeedback('Command recognized!');
        break;
      case 'error':
        setVisualFeedback('Command not recognized. Please try again.');
        break;
      default:
        setVisualFeedback('');
    }
    
    // Announce status change for screen readers
    if (recognitionStatus !== 'idle') {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('role', 'status');
      announcement.className = 'sr-only';
      announcement.textContent = visualFeedback;
      document.body.appendChild(announcement);
      
      // Remove after announcement is read
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }, [recognitionStatus, onStatusChange, visualFeedback]);
  
  // Start/stop processing tick sound effect with visual animation
  useEffect(() => {
    if (recognitionStatus === 'processing') {
      // Play a subtle tick sound during processing
      processingTickRef.current = window.setInterval(() => {
        audioFeedback.processingTick();
      }, 300);
      
      // Add visual processing animation
      let frame = 0;
      const animateProcessing = () => {
        frame = (frame + 1) % 100;
        // Update some visual element based on frame
        animationFrameRef.current = requestAnimationFrame(animateProcessing);
      };
      animationFrameRef.current = requestAnimationFrame(animateProcessing);
    } else {
      // Clear interval when not processing
      if (processingTickRef.current) {
        clearInterval(processingTickRef.current);
        processingTickRef.current = null;
      }
      
      // Clear animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    
    return () => {
      if (processingTickRef.current) {
        clearInterval(processingTickRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [recognitionStatus]);

  // Initialize speech recognition with advanced settings
  useEffect(() => {
    // Use standard SpeechRecognition if available, fall back to webkit prefix
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuousMode;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Increase these values for better command recognition
      if ('maxAlternatives' in recognition) {
        recognition.maxAlternatives = 5; // Get multiple alternatives
      }
      
      recognition.onstart = () => {
        setRecognitionStatus('listening');
        audioFeedback.startListening();
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50); // Short vibration
        }
      };
      
      recognition.onspeechstart = () => {
        isSpeakingRef.current = true;
        // Clear any pause timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      };
      
      recognition.onresult = (event) => {
        // Defensive programming to prevent TypeError when accessing properties on undefined objects
        if (!event || !event.results || !event.results[0] || !event.results[0][0]) {
          console.error('Speech recognition event missing expected structure:', event);
          setRecognitionStatus('error');
          audioFeedback.commandError();
          return;
        }
        
        try {
          // Get primary transcript with safe access
          const transcript = event.results[0][0].transcript.toLowerCase();
          setVoiceCommand(transcript);
          setDisplayedCommand(transcript); // Show what we heard
          
          // Check confidence level - if low, might need to suggest alternatives
          const confidence = event.results[0][0].confidence;
          setConfidenceLevel(confidence);
        
        if (!event.results[0].isFinal) {
            // Interim results - just show what we're hearing
            setRecognitionStatus('listening'); 
          } else {
            // Final result - process command
            setRecognitionStatus('processing');
            
            // Add to history
            setCommandHistory(prev => [...prev.slice(-4), transcript]);
            
            // Process command with enhanced processor
            let success = false;
            
            try {
              if (commandProcessorRef.current) {
                // Use command processor for advanced recognition
                success = commandProcessorRef.current.processCommand(transcript);
              } else {
                // Fallback to direct processing
                success = onCommandReceived(transcript);
              }
              
              if (success) {
                setRecognitionStatus('success');
            audioFeedback.commandSuccess();
            
            // Haptic feedback for success
            if (navigator.vibrate) {
              navigator.vibrate([50, 50, 100]); // Success pattern
            }
          } else {
              setRecognitionStatus('error');
              audioFeedback.commandError();
              
              // Haptic feedback for error
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]); // Error pattern
              }
              
              // Get suggestions for misheard commands
              const suggestions = commandProcessorRef.current?.getSuggestions(transcript) || [];
              if (suggestions.length > 0) {
                setSuggestedCommand(suggestions[0]);
                toast.info(`Did you mean: "${suggestions[0]}"?`, {
                  duration: 3000,
                  action: {
                    label: 'Try This',
                    onClick: () => onCommandReceived(suggestions[0])
                  }
                });
              } else if (commandProcessorRef.current && 
                  commandProcessorRef.current.getCommandExamples().length > 0) {
                const examples = commandProcessorRef.current.getCommandExamples();
                const randomExample = examples[Math.floor(Math.random() * examples.length)];
                setSuggestedCommand(randomExample.example);
                
                setTimeout(() => setSuggestedCommand(null), 6000); // Clear after 6 seconds
              }
            }
          } catch (error) {
            console.error('Error processing voice command:', error);
            setRecognitionStatus('error');
            audioFeedback.commandError();
            toast.error('Error processing voice command');
          }
          
          // Reset status after showing result
          setTimeout(() => {
            if (isListening) {
              setRecognitionStatus('listening');
            } else {
              setRecognitionStatus('idle');
            }
          }, 1500);
        }
      };
      
      recognition.onspeechend = () => {
        isSpeakingRef.current = false;
        
        // Set a timeout to wait for additional speech
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }
        
        if (continuousMode) {
          pauseTimeoutRef.current = window.setTimeout(() => {
            // If no speech after timeout, reset for new command
            commandProcessorRef.current?.reset();
            pauseTimeoutRef.current = null;
          }, pauseTimeoutMs);
        }
      };
      
      recognition.onnomatch = () => {
        toast.error("Didn't recognize that command");
        audioFeedback.commandError();
        setRecognitionStatus('error');
      };
      
      recognition.onerror = (event) => {
        // Ignore no-speech errors in continuous mode
        if (event.error === 'no-speech' && continuousMode) {
          return;
        }
        
        toast.error(`Voice recognition error: ${event.error}`);
        audioFeedback.commandError();
        setIsListening(false);
        setRecognitionStatus('error');
      };
      
      recognition.onend = () => {
        if (isListening && continuousMode) {
          // If we're still supposed to be listening in continuous mode, restart
          try {
            recognition.start();
          } catch (error) {
            console.error('Speech recognition restart error:', error);
          }
        } else {
          // Do not call setIsListening here to avoid infinite loop
          setRecognitionStatus('idle');
        }
      };
      
      setSpeechRecognition(recognition);
    } else {
      // Browser doesn't support speech recognition
      toast.error('Speech recognition is not supported in your browser');
    }
    
    return () => {
      if (speechRecognition) {
        speechRecognition.stop();
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [continuousMode, isListening, onCommandReceived, pauseTimeoutMs]);

  // Start or stop listening based on isListening prop changes
  useEffect(() => {
    if (!speechRecognition) return;
    
    if (isListening) {
      try {
        speechRecognition.start();
      } catch (error) {
        // Handle case where recognition is already started
        console.error('Speech recognition error:', error);
      }
    } else {
      try {
        speechRecognition.stop();
        setRecognitionStatus('idle');
        audioFeedback.stopListening();
        
        // Reset state when stopping
        setVoiceCommand('');
        setDisplayedCommand('');
        commandProcessorRef.current?.reset();
        
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      } catch (error) {
        // Handle case where recognition is already stopped
        console.error('Speech recognition error:', error);
      }
    }
  }, [isListening]);

  /**
   * Accept a suggested command
   */
  const acceptSuggestion = () => {
    if (suggestedCommand && commandProcessorRef.current) {
      // Process the suggested command
      const success = commandProcessorRef.current.processCommand(suggestedCommand);
      if (success) {
        toast.success(`Executed command: ${suggestedCommand}`);
        setSuggestedCommand(null);
      }
    }
  };

  return (
    <div>
      {isListening && (
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md text-sm border border-gray-200 dark:border-gray-600 transition-all duration-300" 
             role="region" 
             aria-label="Voice command interface"
             aria-live="polite">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-6 h-6">
              <div 
                className={`absolute inset-0 rounded-full shadow-md ${recognitionStatus === 'listening' ? 'bg-red-500 animate-listening-pulse' : recognitionStatus === 'processing' ? 'bg-yellow-500 animate-processing-pulse' : recognitionStatus === 'success' ? 'bg-green-500 animate-success-pulse' : recognitionStatus === 'error' ? 'bg-orange-500' : 'bg-gray-500'}`}
                aria-hidden="true"
              ></div>
              {(recognitionStatus === 'success' || recognitionStatus === 'error') && (
                <div className="absolute inset-0 flex items-center justify-center text-white" aria-hidden="true">
                  {recognitionStatus === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {recognitionStatus === 'listening' ? 'Listening...' : 
                 recognitionStatus === 'processing' ? 'Processing...' : 
                 recognitionStatus === 'success' ? 'Command recognized' : 
                 recognitionStatus === 'error' ? 'Command failed' : 'Ready'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {displayedCommand || 'Say a command...'}
              </div>
              {confidenceLevel > 0 && (
                <div className="mt-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${confidenceLevel > 0.7 ? 'bg-green-500' : confidenceLevel > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${confidenceLevel * 100}%` }}
                    aria-label={`Confidence level: ${Math.round(confidenceLevel * 100)}%`}
                    role="progressbar"
                    aria-valuenow={Math.round(confidenceLevel * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Suggestion when command fails */}
          {recognitionStatus === 'error' && suggestedCommand && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded border border-yellow-200 dark:border-yellow-800 text-xs">
              <p className="text-yellow-800 dark:text-yellow-200">Did you mean?</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-medium">"{suggestedCommand}"</span>
                <button 
                  onClick={acceptSuggestion}
                  className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
                >
                  Use This
                </button>
              </div>
            </div>
          )}
          
          {/* Command history */}
          {commandHistory.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 rounded border border-gray-200 dark:border-gray-700 text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-1">Recent commands:</p>
              <ul className="space-y-1" aria-label="Command history">
                {commandHistory.map((cmd, i) => (
                  <li key={i} className={`${i === commandHistory.length - 1 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {cmd}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3">
            <VoiceCommandHelp />
          </div>
        </div>
      )}
      
      {/* Accessibility: Hidden elements for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {visualFeedback}
      </div>
    </div>
  );
}

  const [springProps, setSpringProps] = useState(() => AnimationService.createSpring({ 
    scale: 1,
    opacity: 0.8,
    x: 0,
    y: 0
  }));

  // Add gesture handlers
  const handleGestureStart = useCallback((event: GestureResponderEvent) => {
    AnimationService.handleGestureTransform(event, springProps.x, springProps.x.get());
  }, [springProps.x]);

  const handleGestureEnd = useCallback(() => {
    springProps.x.start(0);
  }, [springProps.x]);

  // Update animation based on recognition status
  useEffect(() => {
    const newSpring = AnimationService.createVoiceInteractionAnimation(recognitionStatus);
    setSpringProps(newSpring);
  }, [recognitionStatus]);

  // Add ARIA labels for accessibility
  const ariaLabel = useMemo(() => {
    return `Voice command ${recognitionStatus} - ${visualFeedback}`;
  }, [recognitionStatus, visualFeedback]);