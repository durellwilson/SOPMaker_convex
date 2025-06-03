import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCopyLink, setShowCopyLink] = useState(false);
  
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
    
    setIsSubmitting(true);
    
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
      
      // Simulate success for better UX demonstration
      setTimeout(() => {
        setEmail('');
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      toast.error('Failed to share SOP');
      console.error(error);
      setIsSubmitting(false);
    }
  };
  
  // Handle copying share link
  const handleCopyLink = () => {
    // In a real app, generate and copy a shareable link
    const dummyLink = `https://yourdomain.com/sop/${sopId}`;
    navigator.clipboard.writeText(dummyLink)
      .then(() => {
        toast.success('Share link copied to clipboard');
        setShowCopyLink(false);
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
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
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 font-medium"
        aria-expanded={isOpen}
        aria-controls="sharing-panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
        </svg>
        <span>{isOpen ? 'Hide Sharing Options' : 'Sharing Options'}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            id="sharing-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 mb-5">
                <button 
                  onClick={() => setShowCopyLink(!showCopyLink)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md transition-colors duration-200 text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Copy Link
                </button>
                
                {isAuthor && (
                  <button 
                    className={`flex items-center gap-2 px-3 py-2 ${isPublic ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-200' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900 dark:hover:bg-yellow-800 dark:text-yellow-200'} rounded-md transition-colors duration-200 text-sm font-medium`}
                    onClick={() => handleVisibilityChange(!isPublic)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {isPublic ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                    {isPublic ? 'Public' : 'Private'}
                  </button>
                )}
              </div>
              
              {/* Copy Link Panel */}
              <AnimatePresence>
                {showCopyLink && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={`https://yourdomain.com/sop/${sopId}`} 
                          className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors duration-200"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Anyone with this link {isPublic ? 'can view this SOP' : 'and proper permissions can access this SOP'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Public/Private Toggle */}
              {isAuthor && (
                <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium dark:text-gray-300">Visibility Settings</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isPublic 
                          ? 'This SOP is visible to everyone in the community' 
                          : 'This SOP is only visible to people you share it with'}
                      </p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isPublic}
                        onChange={() => handleVisibilityChange(!isPublic)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Share with new user */}
              {(isAuthor || collaborators.some(c => c.permission === 'admin')) && (
                <div className="mb-5">
                  <h3 className="text-sm font-medium mb-3 dark:text-gray-300">Invite people</h3>
                  <form onSubmit={handleShare} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={permission}
                        onChange={(e) => setPermission(e.target.value)}
                        className="p-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
                      >
                        <option value="view">Can view</option>
                        <option value="edit">Can edit</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-md hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : 'Invite'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
          
              {/* Collaborators list */}
              {collaborators.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 dark:text-gray-300">People with access</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                      {collaborators.map((collaborator) => (
                        <li key={collaborator.userId} className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors duration-150">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-medium text-sm">
                              {(collaborator.name || collaborator.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium dark:text-gray-200">{collaborator.name || collaborator.email}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${collaborator.permission === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : collaborator.permission === 'edit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                  {collaborator.permission === 'view' && 'Viewer'}
                                  {collaborator.permission === 'edit' && 'Editor'}
                                  {collaborator.permission === 'admin' && 'Admin'}
                                </span>
                                <span className="mx-1">•</span>
                                <span>Added {formatDate(collaborator.sharedAt)}</span>
                              </div>
                            </div>
                          </div>
                          {(isAuthor || collaborators.some(c => c.permission === 'admin' && c.userId !== collaborator.userId)) && (
                            <button
                              onClick={() => handleRemoveCollaborator(collaborator.userId)}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                              aria-label="Remove collaborator"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {collaborators.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {collaborators.length} {collaborators.length === 1 ? 'person' : 'people'} can access this SOP
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}