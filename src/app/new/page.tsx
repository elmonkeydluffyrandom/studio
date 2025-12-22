import JournalForm from '@/components/journal/journal-form';
import { addEntry } from '@/lib/actions';

export default function NewEntryPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <JournalForm action={addEntry} />
    </div>
  );
}
