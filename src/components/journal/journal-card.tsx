'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { JournalEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { JournalCardMenu } from './journal-card-menu';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onView: (entry: JournalEntry) => void;
}

export default function JournalCard({ entry, onEdit, onView }: JournalCardProps) {
  
  const handleCardClick = () => {
    onView(entry);
  }

  return (
      <div 
        className="group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 ease-in-out hover:shadow-md hover:border-primary/30 cursor-pointer"
        onClick={handleCardClick}
      >
        <Card className="flex-grow border-0 shadow-none bg-transparent">
          <CardHeader className="flex-row items-start justify-between p-3 space-y-0">
            <div className='flex-1'>
              <CardTitle className="font-headline text-base leading-tight font-bold">
                {entry.bibleVerse}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {formatDate(entry.createdAt)}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="absolute top-1 right-1">
            <JournalCardMenu entryId={entry.id} onEdit={() => onEdit(entry)} />
        </div>
        
        {(entry.tagIds && entry.tagIds.length > 0) && (
          <CardFooter className="p-3 pt-0">
            <div className="flex flex-wrap gap-1">
              {entry.tagIds.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardFooter>
        )}
      </div>
  );
}
