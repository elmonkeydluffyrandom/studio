import type { JournalEntry } from '@/lib/types';
import JournalCard from './journal-card';
import { Skeleton } from '@/components/ui/skeleton';

interface JournalListProps {
  groupedEntries: Record<string, JournalEntry[]>;
  isLoading: boolean;
}

export default function JournalList({ groupedEntries, isLoading }: JournalListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
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
    <div className="space-y-8">
      {Object.entries(groupedEntries).map(([book, entries]) => (
        <section key={book}>
          <h2 className="text-xl font-headline font-semibold text-foreground/80 mb-4 border-b pb-2">
            {book}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {entries.map(entry => (
              <JournalCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
