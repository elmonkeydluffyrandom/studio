import type { JournalEntry } from '@/lib/types';
import JournalCard from './journal-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

interface JournalListProps {
  groupedEntries: Record<string, JournalEntry[]>;
  isLoading: boolean;
  openBooks: Record<string, boolean>;
  toggleBook: (book: string) => void;
  onEdit: (entry: JournalEntry) => void;
}

export default function JournalList({ groupedEntries, isLoading, openBooks, toggleBook, onEdit }: JournalListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const hasEntries = Object.keys(groupedEntries).length > 0;

  if (!hasEntries) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h2 className="text-xl font-semibold text-muted-foreground">No se encontraron entradas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea una nueva entrada para comenzar tu diario o ajusta tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(groupedEntries).map(([book, entries]) => (
        <Collapsible
          key={book}
          open={openBooks[book] || false}
          onOpenChange={() => toggleBook(book)}
          className="w-full"
        >
          <CollapsibleTrigger className="w-full">
            <div className="flex w-full items-center justify-between rounded-lg bg-muted/50 hover:bg-muted px-4 py-3 transition-colors">
                <div className="flex items-center gap-2">
                     <ChevronRight className={`h-5 w-5 transform transition-transform duration-200 ${openBooks[book] ? 'rotate-90' : ''}`} />
                    <h2 className="text-lg font-headline font-semibold text-foreground/80">
                        {book}
                    </h2>
                </div>
                <span className="text-sm font-medium text-muted-foreground bg-background rounded-full px-2.5 py-0.5">
                    {entries.length}
                </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 pl-8 border-l-2 ml-6">
              {entries.map(entry => (
                <JournalCard key={entry.id} entry={entry} onEdit={onEdit} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
