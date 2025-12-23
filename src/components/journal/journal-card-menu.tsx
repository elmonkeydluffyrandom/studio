'use client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import Link from "next/link";
import { DeleteEntryDialog } from "./delete-entry-dialog";

interface JournalCardMenuProps {
    entryId: string;
}

export function JournalCardMenu({ entryId }: JournalCardMenuProps) {

    const handleMenuClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent the card's Link from firing
        e.stopPropagation();
        e.preventDefault();
    }
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleMenuClick}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={handleMenuClick}>
                <DropdownMenuItem asChild>
                    <Link href={`/entry/${entryId}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Ver/Editar</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DeleteEntryDialog entryId={entryId}>
                    <button 
                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing prematurely
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive hover:bg-accent">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                    </button>
                </DeleteEntryDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
