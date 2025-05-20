import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SpeechRecognition, RecognitionStatus } from '../../types/material';
import { audioFeedback } from '../../utils/audioFeedback';
import { EnhancedVoiceCommandHelp } from './EnhancedVoiceCommandHelp';
import { normalizeCommand, CommandPauseHandler, getSuggestions } from '../../utils/commandUtils';

type VoiceCommandListenerProps = {
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  continuousMode: boolean;
  onCommandReceived: (command: string) => boolean;
  onStatusChange?: (status: RecognitionStatus) => void;
};

/**
 * Component for handling voice command recognition
 * Manages speech recognition lifecycle and provides visual feedback
 */
export function VoiceCommandListener({
  isListening,
  setIsListening,
  continuousMode,
  onCommandReceived,
  onStatusChange
}: VoiceCommandListenerProps) {
  const [voiceCommand, setVoiceCommand] = useState('');
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');
  const [suggestedCommand, setSuggestedCommand] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const processingTickRef = useRef<number | null>(null);
  const pauseHandlerRef = useRef<CommandPauseHandler>(new CommandPauseHandler(5000));
  const isSpeakingRef = useRef<boolean>(false);
  const pauseTimeoutRef = useRef<number | null>(null);
  
  // Update parent component with status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(recognitionStatus);
    }
  }, [recognitionStatus, onStatusChange]);
  
  // Start/stop processing tick sound effect
  useEffect(() => {
    if (recognitionStatus === 'processing') {
      // Play a subtle tick sound every 300ms during processing
      processingTickRef.current = window.setInterval(() => {
        audioFeedback.processingTick();
      }, 300);
    } else {
      // Clear interval when not processing
      if (processingTickRef.current) {
        clearInterval(processingTickRef.current);
        processingTickRef.current = null;
      }
    }
    
    return () => {
      if (processingTickRef.current) {
        clearInterval(processingTickRef.current);
      }
    };
  }, [recognitionStatus]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = continuousMode;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setRecognitionStatus('listening');
        audioFeedback.startListening();
      };
      
      recognition.onspeechstart = () => {
        // Speech detected - visual feedback only
        isSpeakingRef.current = true;
        
        // Clear any pause timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      };
      
      recognition.onresult = (event) => {
        // Safely access results with defensive programming to prevent TypeError
        if (!event || !event.results || !event.results[0] || !event.results[0][0]) {
          console.error('Speech recognition event missing expected structure:', event);
          setRecognitionStatus('error');
          audioFeedback.commandError();
          return;
        }
        
        const transcript = event.results[0][0].transcript.toLowerCase();
        setVoiceCommand(transcript);
        setRecognitionStatus('processing');
        
        // Process final results
        if (event.results[0].isFinal) {
          // Normalize the command to handle common mishearings
          const normalizedCommand = normalizeCommand(transcript);
          
          // Check if this is a continuation of previous command
          const isContinuation = pauseHandlerRef.current.updateContext(normalizedCommand);
          
          // Try to combine with previous command if this might be a continuation
          let commandToProcess = normalizedCommand;
          if (isContinuation) {
            commandToProcess = pauseHandlerRef.current.getCombinedCommand(normalizedCommand);
          }
          
          // Add to command history
          setCommandHistory(prev => [...prev.slice(-4), transcript]);
          
          // Process the command
          const success = onCommandReceived(commandToProcess);
          
          if (success) {
            setRecognitionStatus('success');
            audioFeedback.commandSuccess();
            pauseHandlerRef.current.resetContext(); // Reset context after successful command
          } else {
            setRecognitionStatus('error');
            audioFeedback.commandError();
            
            // Get suggestions for misheard commands
            const suggestions = getSuggestions(transcript);
            if (suggestions.length > 0) {
              setSuggestedCommand(suggestions[0]);
              toast.info(`Did you mean: "${suggestions[0]}"?`, {
                duration: 3000,
                action: {
                  label: 'Try This',
                  onClick: () => onCommandReceived(suggestions[0])
                }
              });
            }
          }
          
          // Reset status after showing result
          setTimeout(() => {
            if (isListening) {
              setRecognitionStatus('listening');
            } else {
              setRecognitionStatus('idle');
            }
            
            // Clear suggested command after a delay
            setTimeout(() => setSuggestedCommand(null), 5000);
          }, 1500);
        }
      };
      
      recognition.onspeechend = () => {
        // Speech ended - mark as not speaking
        isSpeakingRef.current = false;
        
        // Set a timeout to wait for additional speech
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }
        
        if (continuousMode) {
          pauseTimeoutRef.current = window.setTimeout(() => {
            // If no speech after timeout, reset for new command
            pauseHandlerRef.current.resetContext();
            pauseTimeoutRef.current = null;
          }, 5000); // 5 second pause timeout
        }
      };
      
      recognition.onnomatch = () => {
        toast.error("Didn't recognize that command");
        audioFeedback.commandError();
        setRecognitionStatus('error');
      };
      
      recognition.onerror = (event) => {
        toast.error(`Voice recognition error: ${event.error}`);
        audioFeedback.commandError();
        setIsListening(false);
        setRecognitionStatus('error');
      };
      
      recognition.onend = () => {
        if (isListening && continuousMode) {
          // If we're still supposed to be listening in continuous mode, restart
          recognition.start();
        } else {
          // Do not call setIsListening here to avoid infinite loop
          setRecognitionStatus('idle');
        }
      };
      
      setSpeechRecognition(recognition);
    }
    
    return () => {
      if (speechRecognition) {
        speechRecognition.stop();
      }
    };
  }, [continuousMode, isListening, onCommandReceived]);

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
      } catch (error) {
        // Handle case where recognition is already stopped
        console.error('Speech recognition error:', error);
      }
    }
  }, [isListening]);

  return (
    <div>
      {isListening && (
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md text-sm border border-gray-200 dark:border-gray-600 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-6 h-6">
              <div className={`absolute inset-0 rounded-full shadow-md ${recognitionStatus === 'listening' ? 'bg-red-500 animate-listening-pulse' : recognitionStatus === 'processing' ? 'bg-yellow-500 animate-processing-pulse' : recognitionStatus === 'success' ? 'bg-green-500 animate-success-pulse' : recognitionStatus === 'error' ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
              {(recognitionStatus === 'success' || recognitionStatus === 'error') && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
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
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {recognitionStatus === 'listening' ? 'Listening...' : 
                 recognitionStatus === 'processing' ? 'Processing...' : 
                 recognitionStatus === 'success' ? 'Command recognized' : 
                 recognitionStatus === 'error' ? 'Command failed' : 'Ready'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {voiceCommand || 'Say a command...'}
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <EnhancedVoiceCommandHelp />
          </div>
          
          {/* Command suggestion when error occurs */}
          {recognitionStatus === 'error' && suggestedCommand && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded border border-yellow-200 dark:border-yellow-800 text-xs">
              <p className="text-yellow-800 dark:text-yellow-200">Did you mean?</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-medium">"{suggestedCommand}"</span>
                <button 
                  onClick={() => onCommandReceived(suggestedCommand)}
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
              <ul className="space-y-1">
                {commandHistory.slice(-3).map((cmd, i) => (
                  <li key={i} className="text-gray-500 dark:text-gray-400">
                    {cmd}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}