import React from 'react';

type EnhancedVoiceCommandHelpProps = {
  showExtended?: boolean;
  commandExamples?: Array<{ example: string; description: string; category?: string }>;
};

/**
 * Enhanced component for displaying available voice commands
 * Provides better examples and feedback for users
 */
export function EnhancedVoiceCommandHelp({
  showExtended = false,
  commandExamples
}: EnhancedVoiceCommandHelpProps) {
  // Enhanced examples with more natural language variations
  const defaultExamples = [
    { example: "add step pour water", description: "Add a new step", category: "basic" },
    { example: "add material flour", description: "Add a new material", category: "basic" },
    { example: "next", description: "Move to next step", category: "navigation" },
    { example: "previous", description: "Move to previous step", category: "navigation" },
    { example: "set quantity 2 for material 1", description: "Set quantity for material", category: "editing" },
    { example: "set unit cups for material 1", description: "Set unit for material", category: "editing" },
    { example: "rename material 1 to sugar", description: "Change material name", category: "editing" },
    { example: "toggle continuous listening", description: "Toggle listening mode", category: "system" },
    { example: "save", description: "Save current work", category: "system" },
    { example: "delete material 2", description: "Remove a material", category: "editing" },
  ];

  const examples = commandExamples || defaultExamples;
  const displayExamples = showExtended ? examples : examples.slice(0, 6);
  
  // Group examples by category for better organization
  const groupedExamples = displayExamples.reduce((acc, example) => {
    const category = example.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(example);
    return acc;
  }, {} as Record<string, typeof displayExamples>);
  
  // Category labels for better organization
  const categoryLabels: Record<string, string> = {
    basic: "Basic Commands",
    navigation: "Navigation",
    editing: "Editing",
    system: "System Commands",
    other: "Other Commands"
  };

  return (
    <div 
      className="p-3 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 rounded-md text-xs text-gray-700 dark:text-gray-300 border border-indigo-100 dark:border-indigo-800"
      role="region"
      aria-label="Voice command help"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium block text-sm">Voice Command Guide</span>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 italic">Speak naturally with brief pauses</span>
      </div>
      
      {Object.entries(groupedExamples).map(([category, items]) => (
        <div key={category} className="mb-2">
          <h4 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1 border-b border-indigo-100 dark:border-indigo-800 pb-1">
            {categoryLabels[category] || category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="group flex items-start gap-1 p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 dark:hover:bg-opacity-30 rounded transition-colors"
                tabIndex={0}
                role="button"
                aria-label={`Example command: ${item.example}. ${item.description}`}
              >
                <span className="text-indigo-500 dark:text-indigo-400 mt-0.5" aria-hidden="true">•</span>
                <div>
                  <span className="font-medium block">"{item.example}"</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 italic">{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="text-xs mt-3 p-2 bg-indigo-100 dark:bg-indigo-800 dark:bg-opacity-30 rounded">
        <span className="font-medium text-indigo-600 dark:text-indigo-400 block mb-1">Pro Tips:</span>
        <ul className="space-y-1 pl-2">
          <li>• Speak clearly and at a moderate pace</li>
          <li>• For material references, you can use numbers ("material 1") or names ("flour")</li>
          <li>• If a command fails, try rephrasing or using simpler terms</li>
          <li>• Wait for the listening indicator before speaking</li>
        </ul>
      </div>
      
      {!showExtended && examples.length > displayExamples.length && (
        <div className="text-center mt-2">
          <button 
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
            aria-label="Show more command examples"
          >
            Show more commands...
          </button>
        </div>
      )}
    </div>
  );

}