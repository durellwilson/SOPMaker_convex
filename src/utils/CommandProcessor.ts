/**
 * Command Processor for improved voice recognition
 * Provides advanced processing of voice commands with error correction and suggestions
 */

import { toast } from 'sonner';
import { normalizeCommand, fuzzyCommandMatch, extractCommandData, CommandPauseHandler, getSuggestions } from './commandUtils';

type CommandDefinition = {
  // Primary pattern for command matching
  pattern: RegExp;
  // Alternative patterns for the same command (for fuzzy matching)
  alternativePatterns?: RegExp[];
  // Handler function to execute when command is matched
  handler: (command: string, match: RegExpMatchArray | null) => boolean;
  // Examples of valid commands for this definition
  examples: string[];
  // Description of what this command does
  description: string;
  // Keywords used for fuzzy matching
  keywords: string[];
};

export class CommandProcessor {
  private commands: CommandDefinition[] = [];
  private pauseHandler: CommandPauseHandler;
  private lastCommand: string = '';
  private lastSuggestions: string[] = [];
  private static state: ProcessingState = {
    isAcronymMode: false,
    letterBuffer: []
  };

  constructor(pauseTimeoutMs: number = 5000) {
    this.pauseHandler = new CommandPauseHandler(pauseTimeoutMs);
  }
  
  /**
   * Register a new command definition
   */
  registerCommand(command: CommandDefinition): void {
    this.commands.push(command);
  }
  
  /**
   * Process a command string and execute the matching handler
   * @returns true if a command was successfully executed
   */
  static process(rawInput: string, feedbackCallback: (message: string) => void): string {
    const normalized = normalizeCommand(rawInput);

    if (this.state.isAcronymMode) {
      return this.handleAcronymInput(normalized, feedbackCallback);
    }

    if (this.detectAcronymStart(normalized)) {
      return this.startAcronymMode(normalized, feedbackCallback);
    }

    return this.handleNormalCommand(normalized);
  }

  processCommand(rawCommand: string): boolean {
    // Store original command for debugging
    const originalCommand = rawCommand.trim();
    
    // Check if this might be a continuation of previous command
    const isContinuation = this.pauseHandler.updateContext(originalCommand);
    if (isContinuation) {
      // Try combining with previous context
      const combinedCommand = this.pauseHandler.getCombinedCommand(originalCommand);
      // Attempt to process the combined command
      const combinedSuccess = this.attemptCommandExecution(combinedCommand);
      if (combinedSuccess) {
        this.pauseHandler.resetContext(); // Reset context after successful execution
        return true;
      }
    }
    
    // Regular processing if not a continuation or combined processing failed
    const normalizedCommand = normalizeCommand(originalCommand);
    
    // Try to execute the command
    const success = this.attemptCommandExecution(normalizedCommand);
    
    // If command processing failed, provide suggestions
    if (!success) {
      this.lastCommand = originalCommand;
      this.lastSuggestions = getSuggestions(normalizedCommand);
      
      if (this.lastSuggestions.length > 0) {
        // Show suggestions to user
        toast.info(`Did you mean: "${this.lastSuggestions[0]}"? Try saying that instead.`, {
          duration: 3000,
          action: {
            label: 'Use This',
            onClick: () => this.processCommand(this.lastSuggestions[0])
          }
        });
      } else {
        // No specific suggestion available
        toast.error(`Command not recognized: "${originalCommand}"`, {
          duration: 3000,
          action: {
            label: 'See Help',
            onClick: () => {
              // Would open help/examples display
              toast.info('Try commands like "add step", "add material", etc.');
            }
          }
        });
      }
    }
    
    return success;
  }
  
  /**
   * Try to execute a command using exact pattern matching first,
   * then fallback to fuzzy matching if exact match fails
   */
  private attemptCommandExecution(command: string): boolean {
    // First, try exact pattern matching
    for (const cmd of this.commands) {
      // Check primary pattern
      const match = command.match(cmd.pattern);
      if (match) {
        return cmd.handler(command, match);
      }
      
      // Check alternative patterns
      if (cmd.alternativePatterns) {
        for (const altPattern of cmd.alternativePatterns) {
          const altMatch = command.match(altPattern);
          if (altMatch) {
            return cmd.handler(command, altMatch);
          }
        }
      }
    }
    
    // If exact matching fails, try fuzzy matching
    for (const cmd of this.commands) {
      if (fuzzyCommandMatch(command, cmd.keywords)) {
        // If fuzzy match, execute handler with null match (handler should handle this case)
        return cmd.handler(command, null);
      }
    }
    
    return false;
  }
  
  /**
   * Get examples from all registered commands
   */
  getCommandExamples(): { example: string, description: string }[] {
    return this.commands.flatMap(cmd => 
      cmd.examples.map(example => ({
        example,
        description: cmd.description
      }))
    );
  }
  
  /**
   * Accept suggestion - process the suggested command
   */
  acceptSuggestion(): boolean {
    if (this.lastSuggestions.length > 0) {
      return this.processCommand(this.lastSuggestions[0]);
    }
    return false;
  }
  
  /**
   * Reset all context and state
   */
  reset(): void {
    this.pauseHandler.resetContext();
    this.lastCommand = '';
    this.lastSuggestions = [];
  }
}