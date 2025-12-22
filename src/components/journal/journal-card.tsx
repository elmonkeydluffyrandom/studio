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

interface JournalCardProps {
  entry: JournalEntry;
}

export default function JournalCard({ entry }: JournalCardProps) {
  const image = PlaceHolderImages.find(img => img.id === 'journal-card-bg');

  return (
    <Link href={`/entry/${entry.id}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
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
        <CardContent className="flex-grow pt-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {entry.observation}
          </p>
        </CardContent>
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            {entry.tagIds && entry.tagIds.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
