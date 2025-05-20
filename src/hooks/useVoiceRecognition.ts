import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

type VoiceRecognitionOptions = {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
};

const useVoiceRecognition = (options: VoiceRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in this browser');
      return null;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.lang = options.lang ?? 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const resultIndex = event.results.length - 1;
      const transcript = event.results[resultIndex][0].transcript;
      const isFinal = event.results[resultIndex].isFinal;
      
      setTranscript(transcript);
      options.onResult?.(transcript, isFinal);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      options.onError?.(event.error);
      
      if (event.error !== 'aborted') {
        toast.error(`Voice recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      options.onEnd?.();
    };

    return recognition;
  }, [options]);

  // Start listening
  const startListening = useCallback(() => {
    if (isListening) return;

    const recognition = recognitionRef.current || initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      setIsListening(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast.error('Failed to start voice recognition');
    }
  }, [isListening, initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!isListening || !recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      // setIsListening will be set to false in the onend handler
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      setIsListening(false);
    }
  }, [isListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
};

export default useVoiceRecognition;