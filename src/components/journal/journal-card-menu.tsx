'use client';
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { useState } from "react";

interface JournalCardMenuProps {
    entryId: string;
    onEdit: () => void;
}

export function JournalCardMenu({ entryId, onEdit }: JournalCardMenuProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsMenuOpen(!isMenuOpen);
    }
    
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit();
        setIsMenuOpen(false);
    }
    
    return (
        <div className="relative">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleMenuClick}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
            </Button>
            
            {isMenuOpen && (
                <>
                    {/* Overlay to close menu on outside click */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                        }}
                    ></div>

                    {/* Menu Content */}
                    <div 
                        className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-popover border text-popover-foreground z-20 p-1"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
                    >
                        <button
                            onClick={handleEditClick}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                        </button>
                        
                        <div className="my-1 h-px bg-muted"></div>

                        <DeleteEntryDialog entryId={entryId} onDeleted={() => setIsMenuOpen(false)}>
                            <button
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive hover:bg-accent">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                            </button>
                        </DeleteEntryDialog>
                    </div>
                </>
            )}
        </div>
    )
}
