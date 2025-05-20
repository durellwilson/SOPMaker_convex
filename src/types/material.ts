/**
 * Type definitions for materials management
 */

export type Material = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

export type RecognitionStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error';

// Re-export speech recognition types
export type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from './speech-recognition';


// Common units for materials with categories
export const commonUnits = {
  volume: ['ml', 'L', 'cup', 'tbsp', 'tsp', 'fl oz', 'gal'],
  weight: ['g', 'kg', 'mg', 'oz', 'lb'],
  length: ['mm', 'cm', 'm', 'inch', 'ft'],
  count: ['pcs', 'pairs', 'sets', 'boxes'],
  other: ['', 'units']
};

// Flattened units for search
export const allUnits = Object.values(commonUnits).flat();