import { useEffect, useState, useCallback } from 'react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { normalizeCommand } from '../utils/commandUtils';

type ListenerProps = {
  onAcronymStart: () => void;
  onAcronymProgress: (letters: string[]) => void;
  onCommand: (command: string) => void;
};

export const EnhancedVoiceCommandListener = ({
  onAcronymStart,
  onAcronymProgress,
  onCommand
}: ListenerProps) => {
  const [acronymTimeout, setAcronymTimeout] = useState<NodeJS.Timeout>();
  const [letterBuffer, setLetterBuffer] = useState<string[]>([]);
  
  const handleDetection = useCallback((transcript: string) => {
    const normalized = normalizeCommand(transcript);
    
    // Acronym mode detection
    if (normalized.includes('_acronym_timeout')) {
      onAcronymStart();
      setLetterBuffer([]);
      clearTimeout(acronymTimeout);
      setAcronymTimeout(
        setTimeout(() => {
          onCommand(letterBuffer.join(' '));
          setLetterBuffer([]);
        }, parseInt(normalized.split('_acronym_timeout')[1]))
      );
      return;
    }

    // Buffer letters during acronym input
    if (acronymTimeout) {
      const letters = normalized.split(/\s+/);
      setLetterBuffer(prev => [...prev, ...letters]);
      onAcronymProgress([...letterBuffer, ...letters]);
      return;
    }

    onCommand(normalized);
  }, [acronymTimeout, letterBuffer, onAcronymStart, onAcronymProgress, onCommand]);

  useVoiceRecognition(handleDetection);

  return null;
};