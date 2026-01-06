'use client';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';
import JournalForm from '@/components/journal/journal-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react'; // ← Añadir
import { useToast } from '@/hooks/use-toast'; // ← Añadir

export default function EntryEditPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isOnline, setIsOnline] = useState(true); // ← Estado para conexión
  const { toast } = useToast(); // ← Toast para notificaciones

  // ← Efecto para detectar cambios en la conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conectado",
        description: "Ya tienes conexión a internet.",
        duration: 3000,
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "destructive",
        title: "Sin conexión",
        description: "Estás en modo offline. Los cambios se guardarán localmente.",
        duration: 5000,
      });
    };

    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  if (isUserLoading || (entryRef && isEntryLoading)) {
    return <div className="container mx-auto max-w-4xl text-center p-4 md:p-6 lg:p-8">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!entry) {
    return (
        <div className="container mx-auto max-w-4xl text-center p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold">Entrada no encontrada</h1>
            <p className="text-muted-foreground mt-2">
                La entrada que buscas no existe o ha sido eliminada.
            </p>
            <Button asChild className="mt-4">
                <Link href="/">Volver al Dashboard</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      {/* ← Mostrar estado de conexión */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
          <p className="text-yellow-800 font-medium">
            ⚠️ Modo offline: Los cambios se guardarán localmente y se sincronizarán cuando recuperes la conexión.
          </p>
        </div>
      )}
      <JournalForm entry={entry} />
    </div>
  );
}