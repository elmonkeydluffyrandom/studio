"use client";

import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JournalList from '@/components/journal/journal-list';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import Login from '@/components/auth/login';
import { collection, query, orderBy } from 'firebase/firestore';


// This is a client component, but we fetch initial data and then manage state
export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const entriesRef = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'entries'), orderBy('createdAt', 'desc')) : null,
    [user, firestore]
  );

  const { data: entries, isLoading: areEntriesLoading } = useCollection<JournalEntry>(entriesRef);

  const [searchTerm, setSearchTerm] = useState('');
  
  const isLoading = areEntriesLoading || isUserLoading;

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!searchTerm) {
      return entries;
    }
    return entries.filter(entry =>
      entry.bibleReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.observation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.teaching.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [entries, searchTerm]);
  
  if (isUserLoading) {
     return (
        <div className="container mx-auto">
             <div className="flex justify-center items-center h-64">
                <div className="text-2xl font-headline text-muted-foreground">Cargando...</div>
            </div>
        </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">Diario Bíblico</h1>
          <p className="text-muted-foreground">Tus reflexiones recientes.</p>
        </div>
        <Button asChild>
          <Link href="/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Entrada
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <Input
          type="search"
          placeholder="Buscar por cita, palabra clave o etiqueta..."
          className="w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <JournalList entries={filteredEntries || []} isLoading={isLoading} />
    </div>
  );
}
