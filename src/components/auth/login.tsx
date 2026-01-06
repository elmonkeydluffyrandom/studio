'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { Shield, BookOpen, Users } from 'lucide-react';

export default function Login() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleAuthAction = async (action: 'signUp' | 'signIn' | 'anonymous') => {
    if (!auth) return;
    setIsSubmitting(true);

    try {
      if (action === 'signUp') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Cuenta Creada',
          description: '¡Bienvenido! Has iniciado sesión.',
        });
      } else if (action === 'signIn') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Inicio de Sesión Exitoso',
          description: '¡Bienvenido de nuevo!',
        });
      } else if (action === 'anonymous') {
        await signInAnonymously(auth);
        toast({
          title: 'Sesión de Invitado Iniciada',
          description: 'Puedes empezar a explorar. Tus notas se guardarán temporalmente.',
        });
      }
    } catch (error: any) {
      console.error(`Error during ${action}:`, error);
      let description = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está en uso. Intenta iniciar sesión.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = 'Correo electrónico o contraseña incorrectos.';
      } else if (error.code === 'auth/weak-password') {
        description = 'La contraseña debe tener al menos 6 caracteres.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        {/* ENCABEZADO */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BibliaDiario
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            Tu diario espiritual personal. Escribe, reflexiona y guarda tus momentos con Dios.
          </p>
        </div>

        {/* TARJETA DE LOGIN */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl font-headline flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Bienvenido
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Inicia sesión o crea una cuenta para comenzar
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* PESTAÑAS */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-3 text-sm sm:text-base font-medium ${activeTab === 'login' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('login')}
              >
                Iniciar Sesión
              </button>
              <button
                className={`flex-1 py-3 text-sm sm:text-base font-medium ${activeTab === 'register' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('register')}
              >
                Registrarse
              </button>
            </div>

            {/* FORMULARIO */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              {/* BOTONES PRINCIPALES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  onClick={() => handleAuthAction('signIn')} 
                  disabled={isSubmitting || !email || !password}
                  className="h-11 sm:h-12"
                >
                  {activeTab === 'login' ? 'Entrar' : 'Iniciar Sesión'}
                </Button>
                
                <Button 
                  onClick={() => handleAuthAction('signUp')} 
                  variant="secondary" 
                  disabled={isSubmitting || !email || !password}
                  className="h-11 sm:h-12"
                >
                  {activeTab === 'register' ? 'Crear Cuenta' : 'Registrarse'}
                </Button>
              </div>
            </div>

            {/* SEPARADOR */}
            <div className="relative">
              <Separator className="my-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-3 bg-background text-xs text-muted-foreground">
                  O continúa como
                </span>
              </div>
            </div>

            {/* INVITADO */}
            <Button 
              onClick={() => handleAuthAction('anonymous')} 
              variant="outline" 
              disabled={isSubmitting}
              className="w-full h-11 sm:h-12"
            >
              <Shield className="mr-2 h-4 w-4" />
              Entrar como Invitado
            </Button>

            {/* CARACTERÍSTICAS */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Funciona sin internet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Escribe donde sea</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Tus datos seguros</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cifrado y respaldo</p>
                </div>
              </div>
            </div>

            {/* TOGGLE TEMA */}
            <div className="border-t pt-4">
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-blue-600 hover:underline">Términos</a> y{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacidad</a>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            v1.0 • Tu diario espiritual personal
          </p>
        </div>
      </div>
    </div>
  );
}