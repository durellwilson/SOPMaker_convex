import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { toast } from 'sonner';

interface SharedSOPListProps {
  onSelect: (id: Id<"sops"> | null) => void;
}

/**
 * SharedSOPList component displays SOPs shared with the current user
 * and public SOPs from the community.
 */
export function SharedSOPList({ onSelect }: SharedSOPListProps) {
  const [activeTab, setActiveTab] = useState<'shared' | 'community'>('shared');
  
  // Get SOPs shared directly with the user
  const sharedSOPs = useQuery(api.sharing.getSharedSOPs) || [];
  
  // Get public SOPs from the community
  const publicSOPs = useQuery(api.sharing.getPublicSOPs) || [];
  
  // Handle SOP selection
  const handleSelectSOP = (sopId: Id<"sops">) => {
    onSelect(sopId);
    toast.success('Viewing shared SOP');
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800 mb-6">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold dark:text-white">Shared SOPs</h3>
        
        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700 mt-4">
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'shared' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared with me
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'community' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('community')}
          >
            Community
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {activeTab === 'shared' ? (
          <>
            {sharedSOPs.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {sharedSOPs.map((sop) => (
                  <li key={sop._id} className="py-3">
                    <div 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
                      onClick={() => handleSelectSOP(sop._id)}
                    >
                      <div className="font-medium dark:text-white">{sop.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{sop.description}</div>
                      <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>By {sop.authorName}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {sop.permission === 'view' && 'View only'}
                          {sop.permission === 'edit' && 'Can edit'}
                          {sop.permission === 'admin' && 'Admin'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No SOPs have been shared with you yet.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {publicSOPs.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {publicSOPs.map((sop) => (
                  <li key={sop._id} className="py-3">
                    <div 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
                      onClick={() => handleSelectSOP(sop._id)}
                    >
                      <div className="font-medium dark:text-white">{sop.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{sop.description}</div>
                      <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>By {sop.authorName}</span>
                        <span className="mx-2">•</span>
                        <span>Public</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No public SOPs available in the community.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}