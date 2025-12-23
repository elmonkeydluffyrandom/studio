'use client';

import { useState, useTransition, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export function DeleteEntryDialog({ entryId, onDeleted, children }: { entryId: string, onDeleted?: () => void, children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'No autenticado o Firestore no disponible',
            description: 'Debes iniciar sesión para eliminar una entrada.',
        });
        return;
    }
    startTransition(async () => {
      try {
        const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entryId);
        await deleteDoc(entryRef);
        
        toast({
          title: 'Entrada eliminada',
          description: 'Tu entrada ha sido eliminada exitosamente.',
        });
        
        onDeleted?.();
        
        // If on the detail page, navigate back to dashboard after deletion
        if (window.location.pathname.includes(`/entry/${entryId}`)) {
            router.push('/');
        }
        
        setOpen(false); // Close the dialog on success
        
      } catch (error: any) {
        console.error("Error deleting entry:", error);
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
          description: error.message || 'No se pudo eliminar la entrada.',
        });
      }
    });
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    setOpen(true);
  }

  const handleOpenChange = (isOpen: boolean) => {
    // Only update state if not pending, to prevent closing during deletion
    if (!isPending) {
        setOpen(isOpen);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild onClick={handleTriggerClick}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta entrada?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente tu entrada del diario de nuestros servidores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setOpen(false);}} disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
