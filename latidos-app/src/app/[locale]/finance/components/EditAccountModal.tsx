"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, Pencil } from "lucide-react";
import { createPortal } from "react-dom";
import { updateAccount } from "@/app/[locale]/finance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditAccountModalProps {
    account: any;
    isOpen: boolean;
    onClose: () => void;
}

export function EditAccountModal({ account, isOpen, onClose }: EditAccountModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (account) {
            setName(account.name);
        }
    }, [account]);

    if (!mounted || !isOpen || !account) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        try {
            await updateAccount(account.id, { name });
            onClose();
        } catch (error) {
            alert("Error al editar: " + error);
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-card">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-muted" />
                        Editar Cuenta
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-400">Nombre de la Cuenta</Label>
                        <Input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-card border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-brand/50"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading || !name}
                        className="w-full bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/20 font-medium"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>,
        document.body
    );
}
