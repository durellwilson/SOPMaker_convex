import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';

interface SOPSharingPanelProps {
  sopId: Id<"sops">;
  isAuthor: boolean;
}

interface Collaborator {
  userId: Id<"users">;
  email: string;
  name?: string;
  permission: string;
  sharedAt: number;
}

/**
 * SOPSharingPanel component allows users to manage sharing settings for an SOP
 * including setting public visibility and managing collaborators.
 */
export function SOPSharingPanel({ sopId, isAuthor }: SOPSharingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [isPublic, setIsPublic] = useState(false);
  
  // Get SOP data to check current visibility
  const sopData = useQuery(api.sops.getSopWithSteps, { sopId });
  
  // Get collaborators
  const collaborators = useQuery(api.sharing.getSOPCollaborators, { sopId }) || [];
  
  // Mutations
  const shareSOP = useMutation(api.sharing.shareSOP);
  const removeSopShare = useMutation(api.sharing.removeSopShare);
  const setSOPVisibility = useMutation(api.sharing.setSOPVisibility);
  
  // Initialize state from SOP data
  useEffect(() => {
    if (sopData?.sop.isPublic !== undefined) {
      setIsPublic(sopData.sop.isPublic);
    }
  }, [sopData]);
  
  // Handle sharing with a new user
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    try {
      // In a real app, you would need to look up the user ID by email
      // For now, we'll show a toast message
      toast.info('This feature requires user lookup by email which is not implemented yet');
      
      // The actual implementation would look like this:
      // await shareSOP({
      //   sopId,
      //   userId: userIdFromEmail,
      //   permission,
      // });
      // 
      // toast.success(`SOP shared with ${email}`);
      // setEmail('');
    } catch (error) {
      toast.error('Failed to share SOP');
      console.error(error);
    }
  };
  
  // Handle removing a collaborator
  const handleRemoveCollaborator = async (userId: Id<"users">) => {
    try {
      await removeSopShare({
        sopId,
        userId,
      });
      
      toast.success('Collaborator removed');
    } catch (error) {
      toast.error('Failed to remove collaborator');
      console.error(error);
    }
  };
  
  // Handle changing SOP visibility
  const handleVisibilityChange = async (newIsPublic: boolean) => {
    try {
      await setSOPVisibility({
        sopId,
        isPublic: newIsPublic,
      });
      
      setIsPublic(newIsPublic);
      toast.success(`SOP is now ${newIsPublic ? 'public' : 'private'}`);
    } catch (error) {
      toast.error('Failed to update visibility');
      console.error(error);
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
        </svg>
        <span>{isOpen ? 'Hide Sharing Options' : 'Sharing Options'}</span>
      </button>
      
      {isOpen && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          {/* Public/Private Toggle */}
          {isAuthor && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Visibility</h3>
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isPublic}
                    onChange={() => handleVisibilityChange(!isPublic)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isPublic ? 'Public - Anyone can view' : 'Private - Only collaborators can view'}
                  </span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isPublic 
                  ? 'Public SOPs can be viewed by anyone in the community.'
                  : 'Private SOPs can only be viewed by people you share with.'}
              </p>
            </div>
          )}
          
          {/* Share with new user */}
          {(isAuthor || collaborators.some(c => c.permission === 'admin')) && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Share with others</h3>
              <form onSubmit={handleShare} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="view">Can view</option>
                  <option value="edit">Can edit</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                >
                  Share
                </button>
              </form>
            </div>
          )}
          
          {/* Collaborators list */}
          {collaborators.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">People with access</h3>
              <ul className="space-y-2">
                {collaborators.map((collaborator) => (
                  <li key={collaborator.userId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-md">
                    <div>
                      <div className="font-medium dark:text-gray-200">{collaborator.name || collaborator.email}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {collaborator.permission === 'view' && 'Can view'}
                        {collaborator.permission === 'edit' && 'Can edit'}
                        {collaborator.permission === 'admin' && 'Admin'}
                        {' · '}
                        Shared on {formatDate(collaborator.sharedAt)}
                      </div>
                    </div>
                    {(isAuthor || collaborators.some(c => c.permission === 'admin' && c.userId !== collaborator.userId)) && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.userId)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove collaborator"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}