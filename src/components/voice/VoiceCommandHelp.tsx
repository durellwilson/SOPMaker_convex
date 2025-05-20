import React from 'react';

/**
 * Component for displaying available voice commands to help users
 */
export function VoiceCommandHelp() {
  return (
    <div className="p-2 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 rounded-md text-xs text-gray-600 dark:text-gray-300 border border-indigo-100 dark:border-indigo-800">
      <span className="font-medium block mb-1">Try saying:</span>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "add material flour"
        </div>
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "set quantity 2 for material 1"
        </div>
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "set unit cups for material 1"
        </div>
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "remove material 2"
        </div>
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "toggle continuous listening"
        </div>
        <div className="flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400">•</span> "save materials"
        </div>
      </div>
    </div>
  );
}