/**
 * Audio feedback utility for voice commands
 * Provides audio cues to enhance the voice command experience
 */

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

// Initialize audio context on first use (must be triggered by user interaction)
const initAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play a simple tone with specified parameters
 */
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.2
) => {
  try {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    
    // Stop the tone after the specified duration
    setTimeout(() => {
      oscillator.stop();
      oscillator.disconnect();
      gainNode.disconnect();
    }, duration);
  } catch (error) {
    console.error('Error playing audio tone:', error);
  }
};

/**
 * Play a sequence of tones with specified parameters
 */
const playToneSequence = (
  frequencies: number[],
  durations: number[],
  gaps: number[],
  type: OscillatorType = 'sine',
  volume: number = 0.2
) => {
  let currentTime = 0;
  
  frequencies.forEach((freq, index) => {
    setTimeout(() => {
      playTone(freq, durations[index], type, volume);
    }, currentTime);
    
    currentTime += durations[index] + (gaps[index] || 0);
  });
};

// Audio feedback for different voice command states
export const audioFeedback = {
  /**
   * Play a sound when starting to listen
   */
  startListening: () => {
    playTone(880, 100, 'sine', 0.1);
    setTimeout(() => playTone(1320, 100, 'sine', 0.1), 150);
  },
  
  /**
   * Play a sound when stopping listening
   */
  stopListening: () => {
    playTone(1320, 100, 'sine', 0.1);
    setTimeout(() => playTone(880, 100, 'sine', 0.1), 150);
  },
  
  /**
   * Play a sound when a command is recognized
   */
  commandRecognized: () => {
    playToneSequence(
      [440, 554, 659],
      [100, 100, 150],
      [50, 50],
      'sine',
      0.15
    );
  },
  
  /**
   * Play a sound when a command is successfully executed
   */
  commandSuccess: () => {
    playToneSequence(
      [523, 659, 784],
      [80, 80, 200],
      [40, 40],
      'sine',
      0.15
    );
  },
  
  /**
   * Play a sound when a command fails or is not recognized
   */
  commandError: () => {
    playToneSequence(
      [330, 262],
      [200, 300],
      [100],
      'sine',
      0.15
    );
  },
  
  /**
   * Play a subtle tick sound during processing
   */
  processingTick: () => {
    playTone(440, 30, 'sine', 0.05);
  }
};