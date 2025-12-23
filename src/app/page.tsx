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
import { BIBLE_BOOKS } from '@/lib/bible-books';

// This is a client component, but we fetch initial data and then manage state
export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const entriesRef = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'journalEntries'), orderBy('createdAt', 'desc')) : null,
    [user, firestore]
  );

  const { data: entries, isLoading: areEntriesLoading } = useCollection<JournalEntry>(entriesRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [openBooks, setOpenBooks] = useState<Record<string, boolean>>({});

  const isLoading = areEntriesLoading || isUserLoading;

  const toggleBook = (book: string) => {
    setOpenBooks(prev => ({
        ...prev,
        [book]: !prev[book]
    }));
  };

  const groupedAndFilteredEntries = useMemo(() => {
    if (!entries) return {};

    const filtered = entries.filter(entry => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            entry.bibleVerse.toLowerCase().includes(term) ||
            entry.observation.toLowerCase().includes(term) ||
            entry.teaching.toLowerCase().includes(term) ||
            entry.practicalApplication.toLowerCase().includes(term) ||
            (entry.tagIds && entry.tagIds.some(tag => tag.toLowerCase().includes(term))) ||
            (entry.bibleBook && entry.bibleBook.toLowerCase().includes(term))
        );
    });

    const grouped = filtered.reduce((acc, entry) => {
        const book = entry.bibleBook || 'Sin libro';
        if (!acc[book]) {
            acc[book] = [];
        }
        acc[book].push(entry);
        return acc;
    }, {} as Record<string, JournalEntry[]>);
    
    // Sort groups by canonical book order
    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
        const indexA = BIBLE_BOOKS.indexOf(a);
        const indexB = BIBLE_BOOKS.indexOf(b);
        if (indexA === -1) return 1; // Put "Sin libro" at the end
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const sortedGroupedEntries: Record<string, JournalEntry[]> = {};
    for (const key of sortedGroupKeys) {
        // Sort entries within each book by chapter and verse
        const sortedEntries = grouped[key].sort((a, b) => {
            const getVerseParts = (verse: string) => {
                const parts = verse.replace(a.bibleBook || '', '').trim().split(/[:\-,]/);
                return {
                    chapter: parseInt(parts[0], 10) || 0,
                    verse: parseInt(parts[1], 10) || 0,
                };
            };
            const verseA = getVerseParts(a.bibleVerse);
            const verseB = getVerseParts(b.bibleVerse);
            if (verseA.chapter !== verseB.chapter) {
                return verseA.chapter - verseB.chapter;
            }
            return verseA.verse - verseB.verse;
        });
        sortedGroupedEntries[key] = sortedEntries;
    }

    return sortedGroupedEntries;
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
          placeholder="Buscar por libro, cita, palabra clave o etiqueta..."
          className="w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <JournalList 
        groupedEntries={groupedAndFilteredEntries} 
        isLoading={isLoading}
        openBooks={openBooks}
        toggleBook={toggleBook}
      />
    </div>
  );
}
