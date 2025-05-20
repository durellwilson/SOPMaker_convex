import React from 'react';
import { Material } from '../../types/material';

type MaterialItemProps = {
  material: Material;
  allUnits: string[];
  onUpdate: (id: string, field: keyof Material, value: string) => void;
  onRemove: (id: string) => void;
};

/**
 * Component for rendering and managing a single material item
 */
export function MaterialItem({ material, allUnits, onUpdate, onRemove }: MaterialItemProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={material.quantity}
        onChange={(e) => onUpdate(material.id, 'quantity', e.target.value)}
        placeholder="Qty"
        className="w-16 p-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
      />
      
      <select
        value={material.unit}
        onChange={(e) => onUpdate(material.id, 'unit', e.target.value)}
        className="w-20 p-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
      >
        <option value="">-</option>
        {allUnits.map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
      
      <input
        type="text"
        value={material.name}
        onChange={(e) => onUpdate(material.id, 'name', e.target.value)}
        placeholder="Material name"
        className="flex-1 p-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
      />
      
      <button
        onClick={() => onRemove(material.id)}
        className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
        aria-label="Remove material"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}