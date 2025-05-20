import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { toast } from 'sonner';
import { EnhancedPDFExport } from './services/EnhancedPDFExport';
import { useDarkMode } from './contexts/DarkModeContext';

export function SOPExport({ sopId }: { sopId: Id<"sops"> }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'text'>('pdf');
  const [showOptions, setShowOptions] = useState(false);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [presentationType, setPresentationType] = useState<'standard' | 'recipe'>('standard');
  const sopData = useQuery(api.sops.getSopWithSteps, { sopId });
  const { darkMode } = useDarkMode();

  if (!sopData) return null;

  const { sop, steps } = sopData;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'pdf') {
        // For recipe-style grid presentation
        if (presentationType === 'recipe' && sopData?.sop.materials) {
          // Import RecipeGridExport dynamically to avoid loading it unnecessarily
          const { RecipeGridExport } = await import('./services/RecipeGridExport');
          
          await RecipeGridExport.exportToPDF(
            sopData,
            `${sopData.sop.title.replace(/\s+/g, '_')}_Recipe`,
            {
              includeHeader,
              includeFooter,
              companyName: companyName || 'SOP Builder',
              darkMode
            }
          );
          
          toast.success('Recipe-style PDF exported successfully');
          setIsExporting(false);
          setShowOptions(false);
          return;
        }
        
        // Standard presentation - create a temporary div with formatted content
        const tempDiv = document.createElement('div');
        tempDiv.id = 'sop-export-content';
        tempDiv.className = 'p-8 bg-white';
        
        // Add SOP header
        const header = document.createElement('div');
        header.innerHTML = `
          <h1 class="text-2xl font-bold mb-4">${sop.title}</h1>
          <p class="mb-6">${sop.description}</p>
          <hr class="my-6">
          <h2 class="text-xl font-semibold mb-4">Standard Operating Procedure</h2>
        `;
        tempDiv.appendChild(header);
        
        // Add Materials section if available
        if (sop.materials) {
          const materialsSection = document.createElement('div');
          materialsSection.className = 'mb-6';
          
          // Create materials header
          const materialsHeader = document.createElement('h3');
          materialsHeader.className = 'text-lg font-semibold mb-2';
          materialsHeader.textContent = 'Materials Needed:';
          materialsSection.appendChild(materialsHeader);
          
          // Create materials container
          const materialsContainer = document.createElement('div');
          materialsContainer.className = 'p-3 bg-gray-50 rounded-md';
          
          // Create proper list for materials
          const materialsList = document.createElement('ul');
          materialsList.className = 'list-disc pl-5 space-y-1';
          
          // Process each material item
          sop.materials.split('\n')
            .filter(line => line.trim())
            .forEach(line => {
              const listItem = document.createElement('li');
              // Remove bullet points or other markers from the beginning
              listItem.textContent = line.replace(/^[•*\-–]\s+/, '');
              materialsList.appendChild(listItem);
            });
          
          materialsContainer.appendChild(materialsList);
          materialsSection.appendChild(materialsContainer);
          
          // Add separator
          const separator = document.createElement('hr');
          separator.className = 'my-6';
          materialsSection.appendChild(separator);
          
          tempDiv.appendChild(materialsSection);
        }
        
        // Add steps
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'space-y-6';
        
        steps.forEach((step, index) => {
          const stepElement = document.createElement('div');
          stepElement.className = 'mb-4';
          stepElement.innerHTML = `
            <div class="flex gap-3 mb-2">
              <div class="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span class="text-lg font-semibold text-indigo-600">${index + 1}</span>
              </div>
              <div class="flex-1">
                <p class="text-gray-700">${step.instruction}</p>
              </div>
            </div>
          `;
          stepsContainer.appendChild(stepElement);
        });
        
        tempDiv.appendChild(stepsContainer);
        
        // Temporarily add to document, export, then remove
        document.body.appendChild(tempDiv);
        
        // Use enhanced PDF export with options
        await EnhancedPDFExport.exportToPDF(
          'sop-export-content', 
          `${sop.title.replace(/\s+/g, '_')}`, 
          {
            includeHeader,
            includeFooter,
            companyName: companyName || 'SOP Builder',
            darkMode
          }
        );
        
        document.body.removeChild(tempDiv);
        toast.success('PDF exported successfully');
      } else {
        // Text export (original functionality)
        const content = `
# ${sop.title}

${sop.description}

${sop.materials ? `## Materials Needed

${sop.materials}

` : ''}
## Steps

${steps.map((step, index) => `${index + 1}. ${step.instruction}`).join('\n\n')}
        `;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sop.title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Text file exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export SOP');
      console.error(error);
    }
    setIsExporting(false);
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
        >
          Export Options
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>
      </div>
      
      {showOptions && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-4 z-10 border dark:border-gray-700">
          <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Export Options</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`px-3 py-1 rounded-md text-sm ${exportFormat === 'pdf' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  PDF
                </button>
                <button
                  onClick={() => setExportFormat('text')}
                  className={`px-3 py-1 rounded-md text-sm ${exportFormat === 'text' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  Text
                </button>
              </div>
            </div>
            
            {exportFormat === 'pdf' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Presentation Style</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPresentationType('standard')}
                    className={`px-3 py-1 rounded-md text-sm ${presentationType === 'standard' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    title="Standard list presentation"
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setPresentationType('recipe')}
                    className={`px-3 py-1 rounded-md text-sm ${presentationType === 'recipe' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    disabled={!sopData?.sop.materials}
                    title={!sopData?.sop.materials ? "Requires materials to be defined" : "Recipe-style grid presentation"}
                  >
                    Recipe Grid
                  </button>
                </div>
                {presentationType === 'recipe' && !sopData?.sop.materials && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Recipe grid requires materials to be defined
                  </p>
                )}
              </div>
            )}
            
            {exportFormat === 'pdf' && (
              <>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeHeader"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="includeHeader" className="text-sm text-gray-700 dark:text-gray-300">
                    Include header
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeFooter"
                    checked={includeFooter}
                    onChange={(e) => setIncludeFooter(e.target.checked)}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="includeFooter" className="text-sm text-gray-700 dark:text-gray-300">
                    Include page numbers
                  </label>
                </div>
                
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="SOP Builder"
                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}