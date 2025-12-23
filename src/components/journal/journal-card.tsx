'use client';
import Link from 'next/link';
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
}

export default function JournalCard({ entry }: JournalCardProps) {
  
  // Extracts chapter and verse, e.g., "Salmos 23:1" -> "23:1"
  const verseReference = entry.bibleVerse.replace(entry.bibleBook || '', '').trim();

  return (
      <Card className="flex flex-col justify-between overflow-hidden transition-all duration-200 ease-in-out hover:shadow-md hover:border-primary/30">
        <Link href={`/entry/${entry.id}`} className="group block flex-grow">
          <CardHeader className="flex-row items-start justify-between p-3 space-y-0">
            <div className='flex-1'>
              <CardTitle className="font-headline text-base leading-tight font-bold">
                {verseReference || entry.bibleVerse}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {formatDate(entry.createdAt)}
              </CardDescription>
            </div>
            <div className="flex-shrink-0 -mt-1 -mr-1">
              <JournalCardMenu entryId={entry.id} />
            </div>
          </CardHeader>
        </Link>
        
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
      </Card>
  );
}
