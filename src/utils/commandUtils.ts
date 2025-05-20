/**
 * Command utilities for voice recognition
 * Provides helper functions for robust command parsing and fuzzy matching
 */

/**
 * Normalized command strings by removing extra spaces, converting to lowercase,
 * and standardizing common words that might be misheard
 */
// Detects spelled-out letter patterns like 's.o.p' or 's o p'
const isAcronymSpelling = (input: string) => /^(\w\.?\s?)+$/.test(input);

// Maps phonetic letter pronunciations to their actual letters
const phoneticMap: Record<string, string> = {
  'ess': 's',
  'oh': 'o',
  'pee': 'p',
  'see': 'c',
  'you': 'u',
  'are': 'r',
  'kay': 'k'
};

export const normalizeCommand = (command: string): string => {
  let normalized = command.toLowerCase().trim();

  // Handle acronym spelling patterns first
  if (isAcronymSpelling(normalized)) {
    normalized = normalized
      .replace(/\./g, ' ') // Convert s.o.p to s o p
      .split(/\s+/)
      .map(letter => phoneticMap[letter] || letter)
      .join(' ');
  }

  // Replace commonly misheard words with their intended equivalents
  const mishearingMap: Record<string, string> = {
    'sahp': 's o p',
    // Common mishearings
    'add stop': 'add step',
    'at step': 'add step',
    'ad step': 'add step',
    'add staff': 'add step',
    'add stepp': 'add step',
    'add materials': 'add material',
    'ad materials': 'add material',
    'remove materials': 'remove material',
    'delete materials': 'remove material',
    'next step': 'next',
    'go to next': 'next',
    'go next': 'next',
    'go back': 'previous',
    'previous step': 'previous',
    'go to previous': 'previous',
    // Acronym timeout extension flag
    '_acronym_timeout': '2000'
  };

  // Apply mishearing corrections
  Object.entries(mishearingMap).forEach(([misheard, corrected]) => {
    if (normalized.includes(misheard)) {
      normalized = normalized.replace(misheard, corrected);
    }
  });

  return normalized;
};

/**
 * Use fuzzy matching to check if a command matches a pattern
 * Provides more flexibility than exact regex matches
 */
export const fuzzyCommandMatch = (
  command: string,
  keywords: string[],
  threshold: number = 0.7
): boolean => {
  const normalizedCommand = normalizeCommand(command);
  
  // Calculate how many keywords are present in the command
  const matchedKeywords = keywords.filter(keyword => 
    normalizedCommand.includes(keyword.toLowerCase())
  );
  
  // Calculate match ratio based on required keywords
  const matchRatio = matchedKeywords.length / keywords.length;
  
  return matchRatio >= threshold;
};

/**
 * Extract data from commands using flexible patterns
 * More robust than direct regex extraction
 */
export const extractCommandData = (
  command: string,
  dataPatterns: Record<string, RegExp>,
  fallbacks?: Record<string, RegExp>
): Record<string, string | null> => {
  const normalizedCommand = normalizeCommand(command);
  const result: Record<string, string | null> = {};
  
  // Try to extract each data element
  Object.entries(dataPatterns).forEach(([key, pattern]) => {
    const match = normalizedCommand.match(pattern);
    if (match && match.length > 1) {
      result[key] = match[1].trim();
    } else {
      result[key] = null;
      
      // Try fallback pattern if available and primary pattern failed
      if (fallbacks && fallbacks[key]) {
        const fallbackMatch = normalizedCommand.match(fallbacks[key]);
        if (fallbackMatch && fallbackMatch.length > 1) {
          result[key] = fallbackMatch[1].trim();
        }
      }
    }
  });
  
  return result;
};

/**
 * Voice command pause handler with context restoration
 * Stores context when user pauses speech
 */
export class CommandPauseHandler {
  private lastCommand: string | null = null;
  private lastTimestamp: number = 0;
  private pauseTimeoutMs: number;
  
  constructor(pauseTimeoutMs: number = 5000) {
    this.pauseTimeoutMs = pauseTimeoutMs;
  }
  
  /**
   * Update command context
   * @returns true if this is a continuation of previous command
   */
  updateContext(command: string): boolean {
    const now = Date.now();
    const timeSinceLastCommand = now - this.lastTimestamp;
    const isContinuation = (
      this.lastCommand !== null && 
      timeSinceLastCommand < this.pauseTimeoutMs
    );
    
    // Update context
    this.lastCommand = command;
    this.lastTimestamp = now;
    
    return isContinuation;
  }
  
  /**
   * Get the combined command context including the current command
   */
  getCombinedCommand(currentCommand: string): string {
    if (
      this.lastCommand && 
      Date.now() - this.lastTimestamp < this.pauseTimeoutMs
    ) {
      return `${this.lastCommand} ${currentCommand}`;
    }
    
    return currentCommand;
  }
  
  /**
   * Reset the command context
   */
  resetContext(): void {
    this.lastCommand = null;
    this.lastTimestamp = 0;
  }
}

/**
 * Get corrections for common command mishearings
 */
export const getSuggestions = (command: string): string[] => {
  // Map of original commands and their common mishearings
  const suggestionMap: Record<string, string[]> = {
    'add step': ['add stop', 'at step', 'ad step', 'adds step'],
    'add material': ['ad material', 'add materials', 'ad materials'],
    'next': ['next step', 'go next', 'go to next'],
    'previous': ['go back', 'previous step', 'go to previous'],
    'save': ['safe', 'save it', 'save now']
  };
  
  // Check if the command is a known mishearing
  for (const [correctCommand, mishearings] of Object.entries(suggestionMap)) {
    if (mishearings.some(mishearing => command.includes(mishearing))) {
      return [correctCommand];
    }
  }
  
  // If no direct match found, return empty array
  return [];
};