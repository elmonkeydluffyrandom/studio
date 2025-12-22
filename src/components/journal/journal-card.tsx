import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { JournalEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { DeleteEntryDialog } from './delete-entry-dialog';

interface JournalCardProps {
  entry: JournalEntry;
}

export default function JournalCard({ entry }: JournalCardProps) {
  const image = PlaceHolderImages.find(img => img.id === 'journal-card-bg');

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Stop propagation if the click is on a button to prevent navigation
    if ((e.target as HTMLElement).closest('button')) {
      e.preventDefault();
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary/50">
       <Link href={`/entry/${entry.id}`} onClick={handleCardClick} className="group block flex-grow">
        <CardHeader className="relative h-24 p-0">
          {image && (
             <Image 
                src={image.imageUrl} 
                alt={image.description}
                fill
                style={{ objectFit: 'cover' }}
                className="opacity-20 group-hover:opacity-30 transition-opacity"
                data-ai-hint={image.imageHint}
              />
          )}
           <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-card to-transparent">
             <CardTitle className="font-headline text-xl">{entry.bibleVerse}</CardTitle>
             <CardDescription>{formatDate(entry.createdAt)}</CardDescription>
           </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {entry.observation}
          </p>
        </CardContent>
      </Link>
      <CardFooter className="flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2">
            {entry.tagIds && entry.tagIds.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
        </div>
        <div className="flex w-full gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/entry/${entry.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <DeleteEntryDialog entryId={entry.id}>
              <Button variant="destructive" size="sm" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </DeleteEntryDialog>
          </div>
      </CardFooter>
    </Card>
  );
}
