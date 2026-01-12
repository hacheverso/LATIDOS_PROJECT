"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ClientForm from "@/components/sales/ClientForm";

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: any) => void;
    customerToEdit?: any; // If provided, mode is EDIT
    initialName?: string; // Prefill name for new customers
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess, customerToEdit, initialName }: CreateCustomerModalProps) {

    // Escape Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">
                            {customerToEdit ? "Editar Cliente" : "Nuevo Cliente"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Información básica para facturación y contacto.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body using ClientForm */}
                <div className="p-6">
                    <ClientForm
                        customerToEdit={customerToEdit}
                        initialName={initialName}
                        onSuccess={(c) => {
                            onSuccess(c);
                        }}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>
    );
}
