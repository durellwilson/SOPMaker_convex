import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { toast } from 'sonner';

export function SOPExport({ sopId }: { sopId: Id<"sops"> }) {
  const [isExporting, setIsExporting] = useState(false);
  const sopData = useQuery(api.sops.getSopWithSteps, { sopId });

  if (!sopData) return null;

  const { sop, steps } = sopData;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // In a real implementation, you would use a library like jsPDF
      // This is a simplified version that creates a text file
      const content = `
# ${sop.title}

${sop.description}

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
      
      toast.success('SOP exported successfully');
    } catch (error) {
      toast.error('Failed to export SOP');
      console.error(error);
    }
    setIsExporting(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
    >
      {isExporting ? 'Exporting...' : 'Export SOP'}
    </button>
  );
}