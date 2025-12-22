'use client';
import JournalForm from '@/components/journal/journal-form';
import { useUser } from '@/firebase';
import Login from '@/components/auth/login';

export default function NewEntryPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando...</div>
  }

  if (!user) {
    return <Login />;
  }
  return (
    <div className="container mx-auto max-w-4xl">
      <JournalForm />
    </div>
  );
}
