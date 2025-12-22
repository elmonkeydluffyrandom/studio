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
        e.stopPropagation();
    }

    return (
        <DeleteEntryDialog entryId={entryId}>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleMenuClick}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={handleMenuClick}>
                    <DropdownMenuItem asChild>
                        <Link href={`/entry/${entryId}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <DeleteEntryDialog entryId={entryId}>
                            <button className="w-full text-left text-destructive flex items-center">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                            </button>
                        </DeleteEntryDialog>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </DeleteEntryDialog>

    )
}
