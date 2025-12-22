'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25C22.56 11.45 22.49 10.68 22.36 9.92H12V14.49H18.02C17.73 16.03 16.87 17.34 15.53 18.23V20.89H19.5C21.57 19.04 22.56 16.29 22.56 12.25Z" fill="#4285F4"/>
        <path d="M12 23C14.97 23 17.47 22.04 19.5 20.89L15.53 18.23C14.51 18.91 13.33 19.33 12 19.33C9.31 19.33 7.06 17.66 6.2 15.29H2.1V17.95C4.12 21.05 7.79 23 12 23Z" fill="#34A853"/>
        <path d="M6.2 15.29C5.96 14.58 5.83 13.81 5.83 13C5.83 12.19 5.96 11.42 6.2 10.71V8.05H2.1C1.22 9.77 0.67 11.75 0.67 14C0.67 16.25 1.22 18.23 2.1 19.95L6.2 15.29Z" fill="#FBBC05"/>
        <path d="M12 5.67C13.48 5.67 14.67 6.22 15.66 7.15L19.58 3.32C17.47 1.25 14.97 0 12 0C7.79 0 4.12 1.95 2.1 5.05L6.2 8.05C7.06 5.34 9.31 3.67 12 3.67Z" fill="#EA4335"/>
      </svg>
    );
  }

export default function Login() {
  const auth = useAuth();

  const handleGoogleSignIn = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Error during Google sign-in:", error);
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Bienvenido a BibliaDiario</CardTitle>
          <CardDescription>
            Inicia sesión para guardar y administrar tus reflexiones bíblicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleSignIn} className="w-full">
            <GoogleIcon className="mr-2 h-5 w-5" />
            <span>Iniciar sesión con Google</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
