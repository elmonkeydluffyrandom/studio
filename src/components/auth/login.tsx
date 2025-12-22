'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthAction = async (action: 'signUp' | 'signIn') => {
    if (!auth) return;
    setIsSubmitting(true);

    try {
      if (action === 'signUp') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Cuenta Creada',
          description: '¡Bienvenido! Has iniciado sesión.',
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Inicio de Sesión Exitoso',
          description: '¡Bienvenido de nuevo!',
        });
      }
    } catch (error: any) {
      console.error(`Error during ${action}:`, error);
      let description = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está en uso. Intenta iniciar sesión.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
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
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Bienvenido a BibliaDiario</CardTitle>
          <CardDescription>
            Inicia sesión o crea una cuenta para guardar tus reflexiones.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => handleAuthAction('signIn')} disabled={isSubmitting || !email || !password}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => handleAuthAction('signUp')} variant="secondary" disabled={isSubmitting || !email || !password}>
              Crear Cuenta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
