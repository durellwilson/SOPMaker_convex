import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

export function SOPSearch({ onSelect }: { onSelect: (id: Id<"sops">) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const sops = useQuery(api.sops.listSOPs) ?? [];
  
  const filteredSOPs = sops.filter(sop => 
    sop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sop.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mb-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search SOPs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-8 border rounded-md"
        />
        <svg
          className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      
      {searchTerm && (
        <div className="mt-2 bg-white border rounded-md shadow-sm max-h-60 overflow-y-auto">
          {filteredSOPs.length > 0 ? (
            filteredSOPs.map(sop => (
              <div
                key={sop._id}
                className="p-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onSelect(sop._id);
                  setSearchTerm('');
                }}
              >
                <div className="font-medium">{sop.title}</div>
                <div className="text-sm text-gray-600 truncate">{sop.description}</div>
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500">No SOPs found</div>
          )}
        </div>
      )}
    </div>
  );
}