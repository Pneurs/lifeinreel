import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClipActionsProps {
  clipId: string;
  onDelete: (clipId: string) => Promise<boolean>;
  children: React.ReactNode;
}

export const ClipActions: React.FC<ClipActionsProps> = ({
  clipId,
  onDelete,
  children,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(clipId);
    setIsDeleting(false);
    if (success) {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="relative group">
        {children}
        
        {/* Delete button overlay on long press / hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className={cn(
            'absolute top-1.5 left-1.5 w-6 h-6 rounded-full',
            'bg-destructive/90 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'touch-action-none'
          )}
          aria-label="Delete clip"
        >
          <Trash2 className="w-3 h-3 text-destructive-foreground" />
        </button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video clip. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
