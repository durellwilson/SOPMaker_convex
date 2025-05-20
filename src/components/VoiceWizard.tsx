import { useState, useEffect } from 'react';
import { VoiceInputService } from '../services/VoiceInputService';
import { toast } from 'sonner';
import { useDarkMode } from '../contexts/DarkModeContext';

type WizardStep = 'welcome' | 'title' | 'description' | 'materials' | 'review';

export function VoiceWizard({
  onComplete,
  darkMode
}: {
  onComplete: (data: { title: string; description: string; materials: string }) => void;
  darkMode: boolean;
}) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = window.speechSynthesis;

  const speak = (text: string) => {
    if (synth.speaking) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = synth.getVoices().find(v => v.name === 'Google US English') || null;
    utterance.rate = 1.1;
    utterance.pitch = 1;
    
    setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };
    synth.speak(utterance);
  };

  const startListening = () => {
    try {
      VoiceInputService.startListening(currentStep, (text) => {
        handleVoiceResult(text);
        VoiceInputService.stopListening();
      });
    } catch (error) {
      toast.error('Microphone access required');
    }
  };

  const handleVoiceResult = (text: string) => {
    switch (currentStep) {
      case 'title':
        setTitle(text);
        speak('Great! Now please describe the procedure.');
        setCurrentStep('description');
        break;
      case 'description':
        setDescription(text);
        speak('Please list any required materials, one at a time.');
        setCurrentStep('materials');
        break;
      case 'materials':
        setMaterials(prev => VoiceInputService.formatMaterialsList(prev ? `${prev}\n${text}` : text));
        speak('Material added. Say "done" when finished, or add another item.');
        break;
    }
  };

  useEffect(() => {
    if (currentStep === 'welcome') {
      speak('Welcome to SOP creation. Let\'s start with a title for your procedure.');
      setCurrentStep('title');
    }
  }, []);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">Voice Assistant</h2>
          <div className="relative flex h-6 w-6">
            {isSpeaking && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            )}
            <div className="relative inline-flex rounded-full h-6 w-6 bg-blue-500" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Step indicators and input previews */}
          {currentStep === 'review' && (
            <div className="space-y-2">
              <h3 className="font-medium dark:text-gray-200">Ready to create:</h3>
              <p className="dark:text-gray-300">{title}</p>
              <button
                onClick={() => onComplete({ title, description, materials })}
                className="bg-green-500 text-white px-4 py-2 rounded-md w-full"
              >
                Confirm Creation
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            synth.cancel();
            VoiceInputService.stopListening();
            onComplete({ title: '', description: '', materials: '' });
          }}
          className="mt-4 text-red-500 hover:text-red-600 dark:text-red-400"
        >
          Cancel Wizard
        </button>
      </div>
    </div>
  );
}