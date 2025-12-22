'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <Link href="/" className="flex items-center gap-2 font-headline text-lg font-semibold">
            <BookMarked className="h-6 w-6 text-primary" />
            <span className="text-foreground">BibliaDiario</span>
        </Link>
      </div>
    </header>
  );
}
