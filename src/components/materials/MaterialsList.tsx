import React from 'react';
import { Material } from '../../types/material';

type MaterialsListProps = {
  materials: Material[];
  isLoading: boolean;
  onSave: () => void;
};

/**
 * Component for displaying a preview of materials and save button
 */
export function MaterialsList({ materials, isLoading, onSave }: MaterialsListProps) {
  return (
    <div className="space-y-4">
      <div className="mt-3 bg-gray-50 p-3 rounded-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h4 className="font-medium mb-2 text-sm dark:text-gray-300">Preview:</h4>
        <div className="text-sm">
          {materials.some(m => m.name.trim()) ? (
            <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
              {materials
                .filter(m => m.name.trim())
                .map((m, i) => {
                  const quantityPart = m.quantity ? `${m.quantity}${m.unit ? ' ' + m.unit : ''}` : '';
                  return (
                    <li key={i}>
                      {quantityPart && <span className="font-medium">{quantityPart}</span>}
                      {quantityPart && ' '}
                      {m.name}
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-gray-400 italic dark:text-gray-500">No materials added yet</p>
          )}
        </div>
      </div>
      
      <button
        onClick={onSave}
        disabled={isLoading}
        className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Materials
          </>
        )}
      </button>
    </div>
  );
}