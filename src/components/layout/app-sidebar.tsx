'use client';

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, BookMarked, LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/lib/firebase/client';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { signOut } from 'firebase/auth';
import { Button } from '../ui/button';
import { ThemeToggle } from '../theme-toggle';


export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();


  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
    }
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <BookMarked className="h-7 w-7 text-primary" />
          <span className="text-xl font-headline font-semibold text-foreground">
            BibliaDiario
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {user && (
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip={{ children: 'Dashboard' }}
              >
                <Link href="/">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/new'}
                tooltip={{ children: 'Nueva Entrada' }}
              >
                <Link href="/new">
                  <PlusCircle />
                  <span>Nueva Entrada</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter className="flex-col !gap-2 !p-2">
         {user && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
              <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm w-full overflow-hidden">
              <span className="font-semibold text-sidebar-accent-foreground truncate">{user.displayName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        <ThemeToggle />
      </SidebarFooter>
    </>
  );
}
