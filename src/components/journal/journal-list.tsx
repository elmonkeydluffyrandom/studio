import type { JournalEntry } from '@/lib/types';
import JournalCard from './journal-card';
import { Skeleton } from '@/components/ui/skeleton';

interface JournalListProps {
  entries: JournalEntry[];
  isLoading: boolean;
}

export default function JournalList({ entries, isLoading }: JournalListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h2 className="text-xl font-semibold text-muted-foreground">No se encontraron entradas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea una nueva entrada para comenzar tu diario.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map(entry => (
        <JournalCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
