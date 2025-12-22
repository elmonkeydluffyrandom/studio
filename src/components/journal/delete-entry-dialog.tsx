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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

// This component can now accept a trigger from its children,
// making it more flexible to be used within other components like DropdownMenu.
export function DeleteEntryDialog({ entryId, children }: { entryId: string, children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        setOpen(false);
        // Refresh the current page to reflect the deletion
        router.refresh(); 
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
    setOpen(true);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <AlertDialogCancel onClick={(e) => e.stopPropagation()} disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
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
