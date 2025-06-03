/**
 * Type definitions for Web Speech API
 */

export interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: (ev: Event) => void;
  onaudiostart: (ev: Event) => void;
  onend: (ev: Event) => void;
  onerror: (ev: SpeechRecognitionErrorEvent) => void;
  onnomatch: (ev: SpeechRecognitionEvent) => void;
  onresult: (ev: SpeechRecognitionEvent) => void;
  onsoundend: (ev: Event) => void;
  onsoundstart: (ev: Event) => void;
  onspeechend: (ev: Event) => void;
  onspeechstart: (ev: Event) => void;
  onstart: (ev: Event) => void;
  abort(): void;
  start(): void;
  stop(): void;
}

export interface SpeechGrammar {
  src: string;
  weight: number;
}

export interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  [index: number]: SpeechGrammar;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitSpeechGrammarList: new () => SpeechGrammarList;
    SpeechRecognition: new () => SpeechRecognition;
    SpeechGrammarList: new () => SpeechGrammarList;
  }
}