import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import '../styles/animations.css';
import { Material, RecognitionStatus, allUnits } from '../types/material';
import { MaterialsManager } from './materials/MaterialsManager';
import { MaterialsList } from './materials/MaterialsList';
import { VoiceCommandListener } from './voice/VoiceCommandListener';
import { VoiceCommandControls } from './voice/VoiceCommandControls';

type EnhancedMaterialsProps = {
  initialMaterials: string;
  onSave: (formattedMaterials: string) => Promise<void>;
};

/**
 * Enhanced materials component with voice command support
 * Allows users to manage materials with quantities and units
 */
export function EnhancedMaterials({ initialMaterials, onSave }: EnhancedMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');
  
  // Parse initial materials string into structured format
  useEffect(() => {
    if (initialMaterials) {
      const parsedMaterials = initialMaterials
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Remove bullet points or other markers
          const cleanLine = line.replace(/^[•*\-–]\s+/, '').trim();
          
          // Try to extract quantity and unit if they exist
          const quantityMatch = cleanLine.match(/^([\d.]+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)?\s+(.+)$/);
          
          if (quantityMatch) {
            const [, quantity, unit, name] = quantityMatch;
            return {
              id: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: name.trim(),
              quantity: quantity,
              unit: unit || ''
            };
          }
          
          // If no quantity/unit pattern found, treat the whole line as the name
          return {
            id: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: cleanLine,
            quantity: '',
            unit: ''
          };
        });
      
      setMaterials(parsedMaterials);
    }
  }, [initialMaterials]);

  // Process voice commands with enhanced recognition
  const processVoiceCommand = (command: string): boolean => {
    // Import the normalizeCommand function from commandUtils if not already used
    // Normalize the command to handle common mishearings
    const normalizedCommand = command.toLowerCase().trim();
    
    // Command patterns with more variations and greater flexibility
    const addMaterialPattern = /(?:add|create|new|ad|at|put|insert) (?:material|materials|item|items|ingredient|ingredients|supply|supplies)(?:\s+(.+))?/i;
    const removeMaterialPattern = /(?:remove|delete|eliminate|get rid of) (?:material|materials|item|items|ingredient|ingredients|supply|supplies) (\d+|last|\w+)/i;
    const setQuantityPattern = /(?:set|change|make|update) (?:quantity|amount|number|how much|how many) (?:to |of |is |as )?(\d+(?:\.\d+)?) (?:for|to|on|in|of) (?:material|materials|item|items|ingredient|ingredients|supply|supplies) (\d+|last|\w+)/i;
    const setUnitPattern = /(?:set|change|make|update) (?:unit|units|measurement|measure) (?:to |is |as )?(\w+) (?:for|to|on|in|of) (?:material|materials|item|items|ingredient|ingredients|supply|supplies) (\d+|last|\w+)/i;
    const setNamePattern = /(?:set|change|make|rename|update|call) (?:name|title|label) (?:to |is |as )?(.+) (?:for|to|on|in|of) (?:material|materials|item|items|ingredient|ingredients|supply|supplies) (\d+|last|\w+)/i;
    const savePattern = /(?:save|update|store|submit|keep|record|done with) (?:materials|material|items|item|ingredients|ingredient|supplies|supply|changes|all)/i;
    const toggleContinuousPattern = /(?:toggle|switch|change|flip) (?:continuous|always listening|listening mode|continuous mode)/i;
    
    // Helper to get material index - enhanced to handle name-based references
    const getMaterialIndex = (indexStr: string): number => {
      if (indexStr.toLowerCase() === 'last') {
        return materials.length - 1;
      }
      
      // Try to parse as number (1-based index)
      const numIndex = parseInt(indexStr);
      if (!isNaN(numIndex)) {
        return numIndex - 1; // Convert from 1-based to 0-based
      }
      
      // Try to find by name
      const nameIndex = materials.findIndex(m => 
        m.name.toLowerCase().includes(indexStr.toLowerCase())
      );
      
      return nameIndex !== -1 ? nameIndex : -1;
    };
    
    // Process commands with enhanced patterns
    if (addMaterialPattern.test(command)) {
      const match = command.match(addMaterialPattern);
      if (match) {
        if (match[1]) {
          // Add material with name
          const newMaterial = {
            id: Math.random().toString(36).substring(2),
            name: match[1].trim(),
            quantity: '',
            unit: ''
          };
          setMaterials([...materials, newMaterial]);
          toast.success(`Added material: ${match[1].trim()}`);
          return true;
        } else {
          // Add empty material
          addMaterial();
          toast.success('Added new material');
          return true;
        }
      }
    } else if (removeMaterialPattern.test(command)) {
      const match = command.match(removeMaterialPattern);
      if (match && match[1]) {
        const index = getMaterialIndex(match[1]);
        if (index >= 0 && index < materials.length) {
          const materialToRemove = materials[index];
          removeMaterial(materialToRemove.id);
          toast.success(`Removed material ${index + 1}`);
          return true;
        } else {
          toast.error(`Couldn't find material ${match[1]}`);
          return false;
        }
      }
    } else if (setQuantityPattern.test(command)) {
      const match = command.match(setQuantityPattern);
      if (match && match[1] && match[2]) {
        const quantity = match[1];
        const index = getMaterialIndex(match[2]);
        if (index >= 0 && index < materials.length) {
          updateMaterial(materials[index].id, 'quantity', quantity);
          toast.success(`Set quantity to ${quantity} for material ${index + 1}`);
          return true;
        } else {
          toast.error(`Couldn't find material ${match[2]}`);
          return false;
        }
      }
    } else if (setUnitPattern.test(command)) {
      const match = command.match(setUnitPattern);
      if (match && match[1] && match[2]) {
        const unit = match[1];
        const index = getMaterialIndex(match[2]);
        if (index >= 0 && index < materials.length) {
          updateMaterial(materials[index].id, 'unit', unit);
          toast.success(`Set unit to ${unit} for material ${index + 1}`);
          return true;
        } else {
          toast.error(`Couldn't find material ${match[2]}`);
          return false;
        }
      }
    } else if (setNamePattern.test(command)) {
      const match = command.match(setNamePattern);
      if (match && match[1] && match[2]) {
        const name = match[1];
        const index = getMaterialIndex(match[2]);
        if (index >= 0 && index < materials.length) {
          updateMaterial(materials[index].id, 'name', name);
          toast.success(`Set name to "${name}" for material ${index + 1}`);
          return true;
        } else {
          toast.error(`Couldn't find material ${match[2]}`);
          return false;
        }
      }
    } else if (savePattern.test(command)) {
      handleSave();
      return true;
    } else if (toggleContinuousPattern.test(command)) {
      setContinuousMode(!continuousMode);
      toast.success(`${continuousMode ? 'Disabled' : 'Enabled'} continuous listening mode`);
      return true;
    } else {
      toast.info(`Command not recognized: ${command}`);
      return false;
    }
    
    return false; // Default return if no pattern matched completely
  };

  // Toggle voice command listening
  const toggleVoiceCommands = () => {
    setIsListening(!isListening);
  };

  // Add a new empty material
  const addMaterial = () => {
    setMaterials([...materials, {
      id: Math.random().toString(36).substring(2),
      name: '',
      quantity: '',
      unit: ''
    }]);
  };

  // Remove a material by id
  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  // Update a material property
  const updateMaterial = (id: string, field: keyof Material, value: string) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // Format materials back to string format for saving
  const formatMaterialsForSave = (): string => {
    return materials
      .filter(m => m.name.trim()) // Only include materials with names
      .map(m => {
        const quantityPart = m.quantity ? `${m.quantity}${m.unit ? ' ' + m.unit : ''}` : '';
        return `• ${quantityPart}${quantityPart ? ' ' : ''}${m.name}`;
      })
      .join('\n');
  };

  // Handle save
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formattedMaterials = formatMaterialsForSave();
      await onSave(formattedMaterials);
      toast.success(`Materials updated with ${materials.filter(m => m.name.trim()).length} items`);
    } catch (error) {
      toast.error("Failed to save materials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <MaterialsManager
        materials={materials}
        allUnits={allUnits}
        onAddMaterial={addMaterial}
        onUpdateMaterial={updateMaterial}
        onRemoveMaterial={removeMaterial}
      />
      
      <VoiceCommandControls
        isListening={isListening}
        continuousMode={continuousMode}
        recognitionStatus={recognitionStatus}
        onToggleListening={toggleVoiceCommands}
        onToggleContinuousMode={() => setContinuousMode(!continuousMode)}
      />
      
      <VoiceCommandListener
        isListening={isListening}
        setIsListening={setIsListening}
        continuousMode={continuousMode}
        onCommandReceived={processVoiceCommand}
        onStatusChange={setRecognitionStatus}
      />
      
      <MaterialsList
        materials={materials}
        isLoading={isLoading}
        onSave={handleSave}
      />
    </div>
  );
}