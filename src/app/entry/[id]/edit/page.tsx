import JournalForm from '@/components/journal/journal-form';
import { getEntry, updateEntry } from '@/lib/actions';
import { notFound } from 'next/navigation';

export default async function EditEntryPage({ params }: { params: { id: string } }) {
  const entry = await getEntry(params.id);

  if (!entry) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <JournalForm entry={entry} action={updateEntry} />
    </div>
  );
}
