# Voice Input System

This directory contains components and utilities for the voice input system in the SOP application.

## Components

### NavbarVoiceIndicator

A persistent recording indicator that appears in the navigation bar when voice input is active. It shows:
- Which field is being recorded
- Current recording duration
- Stop button to end recording

### VoiceButton

A unified button component for triggering voice input across the application. This ensures consistent behavior and appearance for all voice input buttons.

### VoiceRecordingIndicator

A visual indicator that shows when voice input is active. This can be placed anywhere in the application.

### AppVoiceIndicator

A global voice indicator that appears in the top-right corner of the application when voice input is active.

## Usage

```tsx
// Import the VoiceButton component
import { VoiceButton } from '../components/voice';

// Use it in your component
function MyComponent() {
  const [title, setTitle] = useState('');
  
  return (
    <div>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
      />
      <VoiceButton 
        targetField="title" 
        onTextCapture={setTitle} 
        buttonText="Record Title" 
      />
    </div>
  );
}
```

## Resource Management

The voice input system includes resource management to prevent hardware abuse:

- Automatic timeout after periods of inactivity
- Maximum recording duration limits
- Proper cleanup of microphone resources
- Automatic stopping when page visibility changes

## SOP Pronunciation Handling

The system includes enhanced handling for "SOP" pronunciation variations:

- "sahp" → "SOP"
- "sop" → "SOP"
- "s.o.p" → "SOP"
- "s o p" → "SOP"
- "s-o-p" → "SOP"
- "standard operating procedure" → "SOP"

And plural forms:
- "sahps" → "SOPs"
- "sops" → "SOPs"
- "standard operating procedures" → "SOPs"