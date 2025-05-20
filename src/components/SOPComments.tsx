import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';

interface SOPCommentsProps {
  sopId: Id<"sops">;
}

interface Comment {
  _id: Id<"sopComments">;
  sopId: Id<"sops">;
  userId: Id<"users">;
  content: string;
  createdAt: number;
  parentId?: Id<"sopComments">;
  userName: string;
}

/**
 * SOPComments component displays and allows adding comments to an SOP
 * for collaboration and feedback.
 */
export function SOPComments({ sopId }: SOPCommentsProps) {
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<Id<"sopComments"> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get comments for this SOP
  const comments = useQuery(api.sharing.getSOPComments, { sopId }) || [];
  
  // Add comment mutation
  const addComment = useMutation(api.sharing.addSOPComment);
  
  // Group comments by parent/child relationship
  const topLevelComments = comments.filter(c => !c.parentId);
  const commentReplies = comments.filter(c => c.parentId);
  
  // Handle submitting a new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      await addComment({
        sopId,
        content: comment,
        parentId: replyTo,
      });
      
      setComment('');
      setReplyTo(null);
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
      console.error(error);
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get replies for a comment
  const getRepliesFor = (commentId: Id<"sopComments">) => {
    return commentReplies.filter(reply => reply.parentId === commentId);
  };
  
  // Render a single comment with its replies
  const renderComment = (comment: Comment, isReply = false) => {
    const replies = getRepliesFor(comment._id);
    
    return (
      <div key={comment._id} className={`${isReply ? 'ml-8 mt-3' : 'mb-4 border-b dark:border-gray-700 pb-4'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
              {comment.userName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm dark:text-gray-200">{comment.userName}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
            <button
              onClick={() => setReplyTo(comment._id)}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Reply
            </button>
          </div>
        </div>
        
        {/* Render replies */}
        {replies.length > 0 && (
          <div className="mt-3">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
        <span>{isExpanded ? 'Hide Comments' : `Comments (${comments.length})`}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          {/* Comment form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="mb-2">
              {replyTo && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 p-2 rounded-md mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Replying to comment
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                {replyTo ? 'Reply' : 'Comment'}
              </button>
            </div>
          </form>
          
          {/* Comments list */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {topLevelComments.map(comment => renderComment(comment))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}