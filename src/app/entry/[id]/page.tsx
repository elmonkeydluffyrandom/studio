'use client';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2, Save, X } from 'lucide-react';
import { DeleteEntryDialog } from '@/components/journal/delete-entry-dialog';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';
import DownloadPdfButton from '@/components/journal/DownloadPdfButton';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';

export default function EntryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // This ref is memoized and will be null until `user` and `firestore` are available.
  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  // useDoc handles the null ref and will set isLoading to true.
  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bibleBook: '',
    bibleVerse: '',
    verseText: '',
    observation: '',
    teaching: '',
    practicalApplication: '',
    tagIds: '',
  });

  // This effect synchronizes the form state when the entry data loads or changes.
  useEffect(() => {
    if (entry) {
      const verseOnly = entry.bibleVerse.replace(entry.bibleBook || '', '').trim();
      setFormData({
        bibleBook: entry.bibleBook || '', // Default to empty string if bibleBook is missing
        bibleVerse: verseOnly,
        verseText: entry.verseText,
        observation: entry.observation,
        teaching: entry.teaching,
        practicalApplication: entry.practicalApplication,
        tagIds: entry.tagIds?.join(', ') || '',
      });
    }
  }, [entry]); // Dependency on `entry` ensures this runs when data arrives.
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({...prev, bibleBook: value}));
  }

  const handleUpdate = async () => {
    if (!user || !firestore || !entryRef) return; // Guard against updates if refs are not ready

    const tags = formData.tagIds.split(',').map(tag => tag.trim()).filter(tag => tag);
    const completeBibleVerse = `${formData.bibleBook} ${formData.bibleVerse}`.trim();

    try {
      const entryToUpdate = {
        bibleBook: formData.bibleBook,
        bibleVerse: completeBibleVerse,
        verseText: formData.verseText,
        observation: formData.observation,
        teaching: formData.teaching,
        practicalApplication: formData.practicalApplication,
        tagIds: tags,
        updatedAt: Timestamp.now(),
      };
      
      // Use setDoc with merge to avoid overwriting the whole document
      await setDoc(entryRef, entryToUpdate, { merge: true });

      toast({
        title: 'Entrada actualizada',
        description: 'Tus cambios han sido guardados.',
      });
      setIsEditing(false); // Exit editing mode on success
    } catch (error: any) {
      console.error("Error updating entry:", error);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message || 'No se pudo guardar los cambios.',
      });
    }
  };

  const handleCancel = () => {
    // Reset form to original entry data
    if (entry) {
      const verseOnly = entry.bibleVerse.replace(entry.bibleBook || '', '').trim();
      setFormData({
          bibleBook: entry.bibleBook || '', // Defensive check
          bibleVerse: verseOnly,
          verseText: entry.verseText,
          observation: entry.observation,
          teaching: entry.teaching,
          practicalApplication: entry.practicalApplication,
          tagIds: entry.tagIds?.join(', ') || '',
      });
    }
    setIsEditing(false);
  }

  // --- Robust Loading and Guard States ---

  // 1. Show loading indicator while user or entry data is being fetched.
  if (isUserLoading || (entryRef && isEntryLoading)) {
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando...</div>;
  }

  // 2. After loading, if there's no user, show the login component.
  if (!user) {
    return <Login />;
  }

  // 3. After loading, if there's no entry, it means it doesn't exist.
  if (!entry) {
    return (
        <div className="container mx-auto max-w-4xl text-center p-8">
            <h1 className="text-2xl font-bold">Entrada no encontrada</h1>
            <p className="text-muted-foreground mt-2">
                La entrada que buscas no existe o ha sido eliminada.
            </p>
            <Button asChild className="mt-4">
                <Link href="/">Volver al Dashboard</Link>
            </Button>
        </div>
    );
  }

  // --- Render Component (Data is guaranteed to exist here) ---

  return (
    <div className="container mx-auto max-w-4xl print-container">
      <header className="mb-8 no-print">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
             {isEditing ? (
                 <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <Select onValueChange={handleSelectChange} value={formData.bibleBook || ''}>
                      <FormControl>
                        <SelectTrigger className="sm:w-[250px]">
                          <SelectValue placeholder="Selecciona un libro..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BIBLE_BOOKS.map(book => (
                          <SelectItem key={book} value={book}>{book}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                        name="bibleVerse"
                        value={formData.bibleVerse}
                        onChange={handleInputChange}
                        placeholder="Ej: 23:1-4"
                        className="text-2xl sm:text-4xl font-headline font-bold text-foreground print-title h-auto p-0 border-0 shadow-none focus-visible:ring-0 flex-1"
                    />
                 </div>
            ) : (
                <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground print-title">{entry.bibleVerse}</h1>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {entry.createdAt ? `Creado el ${formatDate(entry.createdAt)}` : ''}
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-center">
            {isEditing ? (
                <>
                    <Button onClick={handleUpdate} variant="default" className="bg-green-600 hover:bg-green-700">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                    <DeleteEntryDialog entryId={entry.id}>
                      <Button variant="destructive" >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                      </Button>
                    </DeleteEntryDialog>
                </>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-8">
        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Escritura (S - Scripture)</h2>
          {isEditing ? (
              <Textarea 
                name="verseText"
                value={formData.verseText}
                onChange={handleInputChange}
                placeholder="Escribe aquí el texto del versículo..."
                className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[120px]"
              />
          ) : (
            <blockquote className="mt-2 border-l-4 border-primary pl-4 italic text-foreground/80 print-text">
                {entry.verseText}
            </blockquote>
          )}
        </div>

        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Observación (O - Observation)</h2>
           {isEditing ? (
              <Textarea 
                name="observation"
                value={formData.observation}
                onChange={handleInputChange}
                placeholder="¿Qué dice el texto? ¿Cuál es el contexto, los hechos, las personas involucradas?"
                className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[150px]"
              />
          ) : (
            <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                {entry.observation}
            </p>
          )}
        </div>
        
        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Aplicación (A - Application)</h2>
          {isEditing ? (
              <Textarea 
                name="teaching"
                value={formData.teaching}
                onChange={handleInputChange}
                placeholder="¿Cómo aplicarás esta verdad a tu vida? ¿Hay algún pecado que confesar, una promesa que reclamar, o un mandato que obedecer?"
                className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[150px]"
              />
          ) : (
            <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                {entry.teaching}
            </p>          )}
        </div>

        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Oración (P - Prayer)</h2>
          {isEditing ? (
              <Textarea 
                name="practicalApplication"
                value={formData.practicalApplication}
                onChange={handleInputChange}
                placeholder="Escribe una oración basada en tu estudio. Habla con Dios sobre lo que has aprendido."
                className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[150px]"
              />
          ) : (
            <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                {entry.practicalApplication}
            </p>
          )}
        </div>

        { (isEditing || (entry.tagIds && entry.tagIds.length > 0)) && (
          <div className="print-section print-tags">
            <h3 className="text-lg font-headline font-semibold print-section-title">Etiquetas</h3>
            {isEditing ? (
                 <Input 
                    name="tagIds"
                    value={formData.tagIds}
                    onChange={handleInputChange}
                    placeholder="Ej: Oración, Familia, Fe (separadas por coma)"
                    className="mt-2"
                 />
            ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                {entry.tagIds?.map(tag => (
                    <Badge key={tag} variant="secondary" className="print-tag">
                    {tag}
                    </Badge>
                ))}
                </div>
            )}
          </div>
        )}
      </div>
      {!isEditing && <DownloadPdfButton entry={entry} />}
    </div>
  );
}
