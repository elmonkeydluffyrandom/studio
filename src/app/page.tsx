"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusCircle, 
  LogOut, 
  Database, 
  Download, 
  Upload,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JournalList from '@/components/journal/journal-list';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import Login from '@/components/auth/login';
import { collection, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import JournalForm from '@/components/journal/journal-form';
import { ViewEntryModal } from '@/components/journal/view-entry-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { Textarea } from '@/components/ui/textarea';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  // 🔥 HERRAMIENTAS DE RECUPERACIÓN
  const [showRecoveryTools, setShowRecoveryTools] = useState(false);
  const [backupData, setBackupData] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 🔥 DEBUG RESPONSIVO
  useEffect(() => {
    console.log("📱 Dashboard - Responsivo:", {
      width: window.innerWidth,
      user: user?.email?.substring(0, 10) + '...' || 'null',
      loading: isUserLoading
    });
  }, [user, isUserLoading]);

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      window.location.reload();
    } catch (error) {
      console.error("❌ Error logout:", error);
    }
  };

  // 🔥 BACKUP DE DATOS
  const exportBackup = async () => {
    if (!user || !firestore) return;
    
    try {
      const entriesRef = collection(firestore, 'users', user.uid, 'journalEntries');
      const snapshot = await getDocs(query(entriesRef, orderBy('createdAt', 'asc')));
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const backup = {
        exportedAt: new Date().toISOString(),
        user: user.email,
        uid: user.uid,
        entriesCount: entries.length,
        entries: entries
      };
      
      const backupStr = JSON.stringify(backup, null, 2);
      setBackupData(backupStr);
      
      // Descargar archivo
      const blob = new Blob([backupStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biblia-diario-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      setRecoveryMessage(`✅ Backup exportado: ${entries.length} entradas`);
    } catch (error) {
      console.error("❌ Error export:", error);
      setRecoveryMessage('❌ Error exportando backup');
    }
  };

  const importBackup = async () => {
    if (!backupData.trim() || !user || !firestore) {
      setRecoveryMessage('❌ No hay datos para importar');
      return;
    }
    
    try {
      const backup = JSON.parse(backupData);
      const batch = writeBatch(firestore);
      
      backup.entries.forEach((entry: any) => {
        const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
        const { id, ...entryData } = entry;
        batch.set(entryRef, entryData);
      });
      
      await batch.commit();
      setRecoveryMessage(`✅ Importadas ${backup.entries.length} entradas`);
      setBackupData('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("❌ Error import:", error);
      setRecoveryMessage('❌ Error importando backup (formato inválido)');
    }
  };

  const entriesRef = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'journalEntries'), orderBy('createdAt', 'desc')) : null,
    [user, firestore]
  );

  const { data: entries, isLoading: areEntriesLoading } = useCollection<JournalEntry>(entriesRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [openBooks, setOpenBooks] = useState<Record<string, boolean>>({});
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isLoading = areEntriesLoading || isUserLoading;

  const handleEdit = (entry: JournalEntry) => {
    setViewingEntry(null);
    setEditingEntry(entry);
  };

  const handleView = (entry: JournalEntry) => {
    setViewingEntry(entry);
  };

  const handleCloseView = () => {
    setViewingEntry(null);
  };

  const handleCloseModals = () => {
    setEditingEntry(null);
    setIsCreating(false);
  };

  const toggleBook = (book: string) => {
    setOpenBooks(prev => ({
      ...prev,
      [book]: !prev[book]
    }));
  };

  const groupedAndFilteredEntries = useMemo(() => {
    if (!entries) return {};

    const filtered = entries.filter(entry => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        entry.bibleVerse?.toLowerCase().includes(term) ||
        entry.observation?.toLowerCase().includes(term) ||
        entry.teaching?.toLowerCase().includes(term) ||
        entry.practicalApplication?.toLowerCase().includes(term) ||
        (entry.tagIds && entry.tagIds.some(tag => tag.toLowerCase().includes(term))) ||
        (entry.bibleBook && entry.bibleBook.toLowerCase().includes(term))
      );
    });

    const grouped = filtered.reduce((acc, entry) => {
      const book = entry.bibleBook || 'Sin libro';
      if (!acc[book]) acc[book] = [];
      acc[book].push(entry);
      return acc;
    }, {} as Record<string, JournalEntry[]>);

    for (const book in grouped) {
      grouped[book].sort((a, b) => {
        return a.bibleVerse.localeCompare(b.bibleVerse, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
      const indexA = BIBLE_BOOKS.indexOf(a);
      const indexB = BIBLE_BOOKS.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const sortedGroupedEntries: Record<string, JournalEntry[]> = {};
    for (const key of sortedGroupKeys) {
      sortedGroupedEntries[key] = grouped[key];
    }

    return sortedGroupedEntries;
  }, [entries, searchTerm]);
  
  // 🔥 LOADING RESPONSIVO
  if (isUserLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center items-center min-h-[60vh] gap-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 dark:bg-blue-900/30"></div>
            </div>
          </div>
          <div className="text-center space-y-3">
            <div className="text-xl sm:text-2xl font-headline text-gray-700 dark:text-gray-300">
              Preparando tu Diario Bíblico
            </div>
            <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md">
              Cargando tus reflexiones guardadas...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
      {/* 🔥 HEADER RESPONSIVO */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          {/* TÍTULO Y MENÚ MÓVIL */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">
                Diario Bíblico
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {user.email ? `Hola, ${user.email.split('@')[0]}` : 'Tus reflexiones'}
              </p>
            </div>
            
            {/* BOTÓN MENÚ MÓVIL */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>

          {/* 🔥 ACCIONES PRINCIPALES (Desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <Button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
              size="sm"
            >
              <PlusCircle size={16} />
              <span>Nueva Entrada</span>
            </Button>
            
            <ThemeToggle />
            
            <Button 
              onClick={() => setShowRecoveryTools(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Database size={16} />
              <span className="hidden lg:inline">Backup</span>
            </Button>
            
            <Button 
              onClick={() => setShowLogoutConfirm(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut size={16} />
              <span className="hidden lg:inline">Salir</span>
            </Button>
          </div>

          {/* 🔥 MENÚ MÓVIL DESPLEGABLE */}
          {showMobileMenu && (
            <div className="sm:hidden w-full border rounded-lg bg-card p-4 mt-2 space-y-3">
              <Button 
                onClick={() => {
                  setIsCreating(true);
                  setShowMobileMenu(false);
                }}
                className="w-full justify-start"
                variant="ghost"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Entrada
              </Button>
              
              <div className="px-3">
                <ThemeToggle />
              </div>
              
              <Button 
                onClick={() => {
                  setShowRecoveryTools(true);
                  setShowMobileMenu(false);
                }}
                className="w-full justify-start"
                variant="ghost"
              >
                <Database className="mr-2 h-4 w-4" />
                Backup de Datos
              </Button>
              
              <Button 
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full justify-start text-red-600"
                variant="ghost"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 🔥 BUSCADOR RESPONSIVO */}
      <div className="my-6 sm:my-8">
        <div className="relative">
          <Input
            type="search"
            placeholder="Buscar por libro, cita, palabra clave..."
            className="w-full pl-10 pr-4 py-6 sm:py-7 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              Limpiar
            </Button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-1">
          {entries ? `${entries.length} reflexiones encontradas` : 'Buscando...'}
        </p>
      </div>

      {/* 🔥 LISTA DE ENTRADAS */}
      <div className="pb-20 sm:pb-8">
        <JournalList 
          groupedEntries={groupedAndFilteredEntries} 
          isLoading={isLoading}
          openBooks={openBooks}
          toggleBook={toggleBook}
          onEdit={handleEdit}
          onView={handleView}
        />
      </div>

      {/* 🔥 BOTÓN FLOTANTE PARA MÓVIL */}
      <div className="sm:hidden fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsCreating(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <PlusCircle size={24} />
        </Button>
      </div>

      {/* 🔥 MODALES */}
      {viewingEntry && (
        <ViewEntryModal
          entry={viewingEntry}
          onClose={handleCloseView}
          onEdit={() => handleEdit(viewingEntry)}
          onDeleteCompleted={handleCloseView}
        />
      )}

      <Dialog open={isCreating || !!editingEntry} onOpenChange={(open) => !open && handleCloseModals()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingEntry ? 'Editar Reflexión' : 'Nueva Reflexión'}
            </DialogTitle>
          </DialogHeader>
          <JournalForm 
            entry={editingEntry}
            onSave={handleCloseModals}
            isModal={true}
          />
        </DialogContent>
      </Dialog>

      {/* 🔥 DIALOGO RECUPERACIÓN */}
      <Dialog open={showRecoveryTools} onOpenChange={setShowRecoveryTools}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Copia de Seguridad
            </DialogTitle>
            <DialogDescription>
              Exporta o importa tus reflexiones. Útil para migrar datos o recuperar información.
            </DialogDescription>
          </DialogHeader>
          
          {recoveryMessage && (
            <div className={`p-3 rounded-lg ${recoveryMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {recoveryMessage}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Exportar Datos</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Descarga todas tus reflexiones en un archivo JSON seguro.
              </p>
              <Button onClick={exportBackup} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exportar Backup
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Importar Datos</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Importa reflexiones desde un archivo JSON exportado previamente.
              </p>
              <Textarea
                placeholder="Pega aquí el contenido del archivo JSON de backup..."
                value={backupData}
                onChange={(e) => setBackupData(e.target.value)}
                className="min-h-[120px] text-sm"
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button onClick={importBackup} className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Backup
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setBackupData('')}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              💡 Tus datos se guardan automáticamente de forma local y en la nube.
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowRecoveryTools(false)}
              className="mt-2 sm:mt-0"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 CONFIRMACIÓN LOGOUT */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Sesión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cerrar sesión? Tus datos están guardados de forma segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🔥 FOOTER INFORMATIVO RESPONSIVO */}
      <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
          <span>BibliaDiario v1.0</span>
          <span className="hidden sm:inline">•</span>
          <span>Tus reflexiones están guardadas {entries ? `(${entries.length})` : ''}</span>
          <span className="hidden sm:inline">•</span>
          <span>Funciona sin conexión</span>
        </div>
      </footer>
    </div>
  );
}
