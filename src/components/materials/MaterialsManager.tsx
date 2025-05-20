import React from 'react';
import { Material } from '../../types/material';
import { MaterialItem } from './MaterialItem';

type MaterialsManagerProps = {
  materials: Material[];
  allUnits: string[];
  onAddMaterial: () => void;
  onUpdateMaterial: (id: string, field: keyof Material, value: string) => void;
  onRemoveMaterial: (id: string) => void;
};

/**
 * Component for managing a list of materials
 */
export function MaterialsManager({
  materials,
  allUnits,
  onAddMaterial,
  onUpdateMaterial,
  onRemoveMaterial
}: MaterialsManagerProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        Add materials with quantities and units
      </div>
      
      <div className="space-y-2">
        {materials.map((material) => (
          <MaterialItem
            key={material.id}
            material={material}
            allUnits={allUnits}
            onUpdate={onUpdateMaterial}
            onRemove={onRemoveMaterial}
          />
        ))}
      </div>
      
      <div className="flex gap-2 justify-between">
        <button
          onClick={onAddMaterial}
          className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Material
        </button>
      </div>
    </div>
  );
}