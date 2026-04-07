"use client";

import { useState, useCallback, useRef } from "react";
import {
    FileUp, X, Check, AlertCircle, Loader2, ChevronRight, ChevronLeft,
    Columns, Eye, Sparkles, ArrowRight, Upload, Table2, CheckCircle2, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { smartImport } from "@/app/inventory/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportMode = "catalog" | "purchase" | "initial_balance";

type FieldKey = "name" | "upc" | "sku" | "category" | "price" | "cost" | "quantity" | "imageUrl" | "daysOld";

interface FieldDef {
    key: FieldKey;
    label: string;
    required: boolean;
    keywords: string[];
    patternTest?: (values: string[]) => number; // Returns confidence 0-1
}

interface ColumnMapping {
    columnIndex: number;
    fieldKey: FieldKey | "__skip";
    confidence: number;
    headerText: string;
    sampleValues: string[];
}

interface Props {
    mode: ImportMode;
    onClose: () => void;
}

// ─── Field definitions per mode ──────────────────────────────────────────────

const FIELD_DEFS: Record<ImportMode, FieldDef[]> = {
    catalog: [
        { key: "name", label: "Nombre del Producto", required: true, keywords: ["nombre", "name", "producto", "product", "descripcion", "description", "articulo", "item"] },
        { key: "upc", label: "UPC / Código de Barras", required: true, keywords: ["upc", "code", "código", "codigo", "barcode", "ean", "cod", "bar"], patternTest: (vals) => vals.filter(v => /^\d{6,15}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "sku", label: "SKU / Referencia", required: false, keywords: ["sku", "ref", "referencia", "reference", "modelo", "model"] },
        { key: "category", label: "Categoría", required: false, keywords: ["categ", "category", "tipo", "type", "linea", "línea", "familia"] },
        { key: "price", label: "Precio de Venta", required: false, keywords: ["precio", "price", "venta", "pvp", "sale", "p.venta", "p. venta"] },
        { key: "cost", label: "Costo Promedio", required: false, keywords: ["costo", "cost", "compra", "buy", "c.promedio", "c. promedio", "costo promedio", "avg cost"] },
        { key: "quantity", label: "Cantidad / Stock", required: false, keywords: ["cant", "stock", "qty", "cantidad", "unid", "units", "existencia", "inv"], patternTest: (vals) => vals.filter(v => /^\d{1,5}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "imageUrl", label: "URL de Imagen", required: false, keywords: ["img", "image", "imagen", "foto", "url", "photo", "picture"], patternTest: (vals) => vals.filter(v => v.trim().startsWith("http")).length / Math.max(vals.length, 1) },
    ],
    purchase: [
        { key: "upc", label: "UPC / Código de Barras", required: true, keywords: ["upc", "code", "código", "codigo", "barcode", "ean", "cod"], patternTest: (vals) => vals.filter(v => /^\d{6,15}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "quantity", label: "Cantidad", required: true, keywords: ["cant", "stock", "qty", "cantidad", "unid", "units"], patternTest: (vals) => vals.filter(v => /^\d{1,5}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "cost", label: "Costo Unitario", required: false, keywords: ["costo", "cost", "compra", "buy", "unit cost", "costo unitario"] },
    ],
    initial_balance: [
        { key: "upc", label: "UPC / Código de Barras", required: true, keywords: ["upc", "code", "código", "codigo", "barcode", "ean", "cod"], patternTest: (vals) => vals.filter(v => /^\d{6,15}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "quantity", label: "Cantidad", required: true, keywords: ["cant", "stock", "qty", "cantidad", "unid", "units"], patternTest: (vals) => vals.filter(v => /^\d{1,5}$/.test(v.trim())).length / Math.max(vals.length, 1) },
        { key: "cost", label: "Costo Unitario", required: false, keywords: ["costo", "cost", "compra", "buy"] },
        { key: "price", label: "Precio de Venta", required: false, keywords: ["precio", "price", "venta", "pvp"] },
        { key: "daysOld", label: "Días de Antigüedad", required: false, keywords: ["dia", "day", "antigued", "old", "dias", "days"] },
    ],
};

const MODE_META: Record<ImportMode, { title: string; subtitle: string; color: string; icon: string }> = {
    catalog: { title: "Importar Catálogo", subtitle: "Crear o actualizar productos", color: "blue", icon: "📦" },
    purchase: { title: "Importar Compra", subtitle: "Registrar compra masiva al inventario", color: "emerald", icon: "🛒" },
    initial_balance: { title: "Carga Saldo Inicial", subtitle: "Primer inventario con historial", color: "indigo", icon: "📊" },
};

// ─── Column Auto-Detection ───────────────────────────────────────────────────

function autoDetectColumns(headers: string[], dataRows: string[][], fields: FieldDef[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const usedFields = new Set<FieldKey>();

    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx]?.toLowerCase().trim() || "";
        const sampleValues = dataRows.map(row => row[colIdx] || "").filter(v => v.trim().length > 0).slice(0, 5);

        let bestField: FieldKey | "__skip" = "__skip";
        let bestConfidence = 0;

        for (const field of fields) {
            if (usedFields.has(field.key)) continue;

            // 1. Header keyword matching
            let headerScore = 0;
            for (const kw of field.keywords) {
                if (header.includes(kw)) {
                    headerScore = Math.max(headerScore, kw.length / Math.max(header.length, 1));
                }
            }
            // Boost exact or near-exact matches
            if (headerScore > 0.5) headerScore = Math.min(headerScore * 1.5, 1);

            // 2. Data pattern matching
            let patternScore = 0;
            if (field.patternTest && sampleValues.length > 0) {
                patternScore = field.patternTest(sampleValues);
            }

            const combined = Math.max(headerScore * 0.9, patternScore * 0.7, (headerScore * 0.6 + patternScore * 0.4));

            if (combined > bestConfidence && combined > 0.2) {
                bestConfidence = combined;
                bestField = field.key;
            }
        }

        if (bestField !== "__skip") {
            usedFields.add(bestField as FieldKey);
        }

        mappings.push({
            columnIndex: colIdx,
            fieldKey: bestField,
            confidence: bestConfidence,
            headerText: headers[colIdx] || `Columna ${colIdx + 1}`,
            sampleValues,
        });
    }

    return mappings;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function parseCurrency(val: string | undefined): number {
    if (!val) return 0;
    if (val.toUpperCase().includes("NO VENDIDO")) return 0;
    let clean = val.replace(/[$\s#]/g, "");
    // Handle Colombian format: 1.234.567 or 1,234,567 
    if (clean.includes(".") && clean.includes(",")) {
        // If comma comes after last dot → European format (1.234,56)
        if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
            clean = clean.replace(/\./g, "").replace(",", ".");
        } else {
            // American format (1,234.56)
            clean = clean.replace(/,/g, "");
        }
    } else if ((clean.match(/\./g) || []).length > 1) {
        // Multiple dots = thousands separator (1.234.567)
        clean = clean.replace(/\./g, "");
    } else if (clean.includes(",") && !clean.includes(".")) {
        // Single comma, no dot — could be decimal separator
        const parts = clean.split(",");
        if (parts[1] && parts[1].length <= 2) {
            clean = clean.replace(",", "."); // Decimal
        } else {
            clean = clean.replace(",", ""); // Thousands
        }
    }
    return parseFloat(clean) || 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SmartImportWizard({ mode, onClose }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const meta = MODE_META[mode];
    const fields = FIELD_DEFS[mode];

    // Step state
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: File
    const [file, setFile] = useState<File | null>(null);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [parseError, setParseError] = useState<string | null>(null);

    // Step 2: Mappings
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);

    // Step 3: Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; count?: number; skippedCount?: number; errors: string[]; message?: string } | null>(null);

    // ─── Step 1: Parse file ──────────────────────────────────────────────────

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setParseError(null);
        setResult(null);

        const fileName = selectedFile.name.toLowerCase();

        try {
            if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
                // Excel parsing
                const XLSX = (await import("xlsx")).default;
                const buffer = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const data: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

                if (data.length < 2) {
                    setParseError("El archivo tiene menos de 2 filas. Se necesita al menos 1 header + 1 fila de datos.");
                    return;
                }

                const headers = data[0].map(h => String(h));
                const rows = data.slice(1).filter(row => row.some(cell => String(cell).trim().length > 0)).map(row => row.map(cell => String(cell)));

                setRawHeaders(headers);
                setRawRows(rows);

                // Auto-detect and advance
                const detected = autoDetectColumns(headers, rows.slice(0, 10), fields);
                setMappings(detected);
                setStep(2);

            } else {
                // CSV/TSV parsing  
                const text = await selectedFile.text();

                if (text.startsWith("PK")) {
                    setParseError("Este archivo parece ser un .xlsx renombrado a .csv. Por favor sube el archivo original .xlsx o guárdalo como CSV desde Excel/Google Sheets.");
                    return;
                }

                const parsed = Papa.parse(text, { skipEmptyLines: true, header: false });
                const allRows = parsed.data as string[][];

                if (allRows.length < 2) {
                    setParseError("El archivo tiene menos de 2 filas. Se necesita al menos 1 header + 1 fila de datos.");
                    return;
                }

                const headers = allRows[0];
                const rows = allRows.slice(1).filter(row => row.some(cell => cell.trim().length > 0));

                setRawHeaders(headers);
                setRawRows(rows);

                const detected = autoDetectColumns(headers, rows.slice(0, 10), fields);
                setMappings(detected);
                setStep(2);
            }
        } catch (err) {
            setParseError(`Error al leer el archivo: ${(err as Error).message}`);
        }
    }, [fields]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    // ─── Step 2: Mapping changes ─────────────────────────────────────────────

    const updateMapping = (colIdx: number, newFieldKey: FieldKey | "__skip") => {
        setMappings(prev => {
            const updated = [...prev];
            // Clear any other column that had this field
            if (newFieldKey !== "__skip") {
                for (const m of updated) {
                    if (m.fieldKey === newFieldKey && m.columnIndex !== colIdx) {
                        m.fieldKey = "__skip";
                        m.confidence = 0;
                    }
                }
            }
            const target = updated.find(m => m.columnIndex === colIdx);
            if (target) {
                target.fieldKey = newFieldKey;
                target.confidence = newFieldKey === "__skip" ? 0 : 1;
            }
            return updated;
        });
    };

    // Validation: check required fields are mapped
    const getMappingErrors = (): string[] => {
        const errors: string[] = [];
        for (const field of fields) {
            if (field.required) {
                const mapped = mappings.find(m => m.fieldKey === field.key);
                if (!mapped) {
                    errors.push(`"${field.label}" es obligatorio pero no está asignado a ninguna columna.`);
                }
            }
        }
        return errors;
    };

    // ─── Step 3: Preview data ────────────────────────────────────────────────

    const getPreviewRows = () => {
        return rawRows.slice(0, 15).map((row, rowIdx) => {
            const mapped: Record<string, string> = {};
            for (const m of mappings) {
                if (m.fieldKey !== "__skip") {
                    mapped[m.fieldKey] = row[m.columnIndex] || "";
                }
            }
            // Validate row
            const errors: string[] = [];
            for (const field of fields) {
                if (field.required && (!mapped[field.key] || mapped[field.key].trim() === "")) {
                    errors.push(`${field.label} vacío`);
                }
            }
            return { rowIdx: rowIdx + 2, mapped, errors, raw: row };
        });
    };

    // ─── Submit ──────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsProcessing(true);
        try {
            // Build structured rows from raw data + mappings
            const structuredRows = rawRows.map(row => {
                const mapped: any = {};
                for (const m of mappings) {
                    if (m.fieldKey !== "__skip") {
                        const raw = row[m.columnIndex] || "";
                        if (m.fieldKey === "price" || m.fieldKey === "cost") {
                            mapped[m.fieldKey] = parseCurrency(raw);
                        } else if (m.fieldKey === "quantity" || m.fieldKey === "daysOld") {
                            mapped[m.fieldKey] = parseInt(raw.replace(/[^\d]/g, "")) || 0;
                        } else {
                            mapped[m.fieldKey] = raw.trim();
                        }
                    }
                }
                return mapped;
            }).filter(row => {
                // Filter out rows with no meaningful data
                if (mode === "catalog") return row.name || row.upc;
                return row.upc;
            });

            const res = await smartImport({ mode, rows: structuredRows });
            setResult(res);
            if (res.success && res.errors.length === 0) {
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 2500);
            } else {
                router.refresh();
            }
        } catch (err) {
            setResult({ success: false, errors: [(err as Error).message], count: 0 });
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Reset ───────────────────────────────────────────────────────────────

    const reset = () => {
        setFile(null);
        setRawHeaders([]);
        setRawRows([]);
        setMappings([]);
        setParseError(null);
        setResult(null);
        setStep(1);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ─── Color helpers ───────────────────────────────────────────────────────

    const accent = meta.color;
    const accentBg = accent === "blue" ? "bg-blue-600" : accent === "emerald" ? "bg-emerald-600" : "bg-indigo-600";
    const accentBgLight = accent === "blue" ? "bg-blue-50 dark:bg-blue-500/10" : accent === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-indigo-50 dark:bg-indigo-500/10";
    const accentText = accent === "blue" ? "text-blue-600 dark:text-blue-400" : accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400";
    const accentBorder = accent === "blue" ? "border-blue-500" : accent === "emerald" ? "border-emerald-500" : "border-indigo-500";

    const mappingErrors = getMappingErrors();

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-border flex justify-between items-center bg-header shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                            <h3 className="text-base font-black text-primary uppercase tracking-tight">{meta.title}</h3>
                            <p className="text-[11px] text-secondary font-medium">{meta.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Step indicator */}
                        <div className="hidden sm:flex items-center gap-1.5">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                                    step === s ? `${accentBg} text-white shadow-lg` :
                                        step > s ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                            "bg-header text-secondary border border-border"
                                )}>
                                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                                </div>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-hover text-secondary hover:text-red-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {result ? (
                        // ─── RESULT STATE ────────────────────────────────────────
                        <div className="p-8 space-y-6 text-center">
                            {result.success ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className={`p-5 rounded-full ${result.errors.length > 0 ? "bg-orange-100 dark:bg-orange-500/10 text-orange-600" : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                                            {result.errors.length > 0 ? <AlertCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-primary uppercase">
                                                {result.errors.length > 0 ? "Proceso Finalizado" : "¡Importación Exitosa!"}
                                            </h4>
                                            <p className="text-secondary text-sm font-medium mt-2 max-w-sm mx-auto">
                                                {result.message || `Se procesaron ${result.count || 0} registros.`}
                                                {(result.skippedCount ?? 0) > 0 && (
                                                    <span className="block mt-1 text-orange-600 dark:text-orange-400">
                                                        {result.skippedCount} códigos omitidos por no estar registrados.
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {result.errors.length > 0 && (
                                        <div className="bg-orange-50 dark:bg-orange-500/5 rounded-xl p-4 text-left max-h-40 overflow-y-auto border border-orange-200 dark:border-orange-500/20">
                                            <p className="text-xs font-bold text-orange-900 dark:text-orange-300 mb-2 uppercase">Advertencias:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                {result.errors.slice(0, 20).map((err, i) => (
                                                    <li key={i} className="text-xs font-medium text-orange-800 dark:text-orange-400">{err}</li>
                                                ))}
                                                {result.errors.length > 20 && (
                                                    <li className="text-xs font-bold text-orange-800">... y {result.errors.length - 20} más</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button onClick={onClose} className="flex-1 py-3 font-bold text-primary hover:bg-hover rounded-xl border border-border transition-colors">
                                            Cerrar
                                        </button>
                                        <button onClick={reset} className="flex-1 py-3 font-bold text-white bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 rounded-xl transition-colors">
                                            <RotateCcw className="w-4 h-4 inline mr-2" />
                                            Nueva Carga
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-3 text-red-500">
                                        <AlertCircle className="w-12 h-12" />
                                        <h4 className="font-black uppercase text-primary text-lg">Error Crítico</h4>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-4 text-left border border-red-200 dark:border-red-500/20">
                                        {result.errors.map((err, i) => (
                                            <p key={i} className="text-sm font-medium text-red-800 dark:text-red-400">{err}</p>
                                        ))}
                                    </div>
                                    <button onClick={reset} className="w-full py-3 font-bold text-secondary hover:bg-hover rounded-xl transition-colors">
                                        Intentar de nuevo
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : step === 1 ? (
                        // ─── STEP 1: FILE UPLOAD ─────────────────────────────────
                        <div className="p-8 space-y-6">
                            <div className="text-center mb-2">
                                <h4 className="text-sm font-black text-primary uppercase tracking-wider">Paso 1 · Seleccionar Archivo</h4>
                                <p className="text-xs text-secondary font-medium mt-1">CSV, Excel (.xlsx), o TSV — el sistema detecta el formato automáticamente</p>
                            </div>

                            <label
                                className={cn(
                                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all group cursor-pointer relative block w-full overflow-hidden",
                                    file ? `${accentBorder} ${accentBgLight}` : "border-border hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.tsv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                    onChange={handleFileInputChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                />
                                <div className={cn(
                                    "p-5 rounded-full group-hover:scale-110 transition-transform relative z-10 pointer-events-none",
                                    file ? accentBgLight : "bg-slate-100 dark:bg-white/5"
                                )}>
                                    <Upload className={cn("w-8 h-8", file ? accentText : "text-secondary")} />
                                </div>
                                <div className="text-center relative z-10 pointer-events-none">
                                    <p className="font-bold text-primary text-sm">
                                        {file ? file.name : "Click para seleccionar o arrastra tu archivo aquí"}
                                    </p>
                                    <p className="text-xs text-secondary mt-1.5 font-medium max-w-md mx-auto">
                                        Soporta cualquier orden de columnas — el sistema las detecta automáticamente
                                    </p>
                                </div>
                            </label>

                            {parseError && (
                                <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-4 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium text-red-800 dark:text-red-400">{parseError}</p>
                                </div>
                            )}

                            {/* Quick help */}
                            <div className="bg-header rounded-xl p-4 border border-border">
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> ¿Cómo funciona?
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white", accentBg)}>1</span>
                                        Subes tu archivo
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white", accentBg)}>2</span>
                                        Confirmas columnas
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white", accentBg)}>3</span>
                                        Previsualiza y envía
                                    </div>
                                </div>
                            </div>
                        </div>

                    ) : step === 2 ? (
                        // ─── STEP 2: COLUMN MAPPING ──────────────────────────────
                        <div className="p-6 space-y-5">
                            <div className="text-center">
                                <h4 className="text-sm font-black text-primary uppercase tracking-wider flex items-center justify-center gap-2">
                                    <Columns className="w-4 h-4" />
                                    Paso 2 · Mapeo de Columnas
                                </h4>
                                <p className="text-xs text-secondary font-medium mt-1">
                                    Revisa las asignaciones automáticas. Ajusta si es necesario.
                                </p>
                            </div>

                            {/* Mapping cards */}
                            <div className="space-y-2">
                                {mappings.map(m => {
                                    const isSkipped = m.fieldKey === "__skip";
                                    const isHighConfidence = m.confidence > 0.6;
                                    const isRequired = fields.find(f => f.key === m.fieldKey)?.required;

                                    return (
                                        <div
                                            key={m.columnIndex}
                                            className={cn(
                                                "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-all",
                                                isSkipped ? "bg-header border-border opacity-60" :
                                                    isHighConfidence ? "bg-card border-emerald-200 dark:border-emerald-500/20" :
                                                        "bg-card border-orange-200 dark:border-orange-500/20"
                                            )}
                                        >
                                            {/* Column info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-secondary uppercase bg-header px-1.5 py-0.5 rounded border border-border">
                                                        Col {m.columnIndex + 1}
                                                    </span>
                                                    <span className="font-bold text-primary text-xs truncate">
                                                        {m.headerText}
                                                    </span>
                                                    {!isSkipped && isHighConfidence && (
                                                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                                            <Check className="w-2.5 h-2.5" /> Auto
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Sample values */}
                                                <div className="flex gap-1 flex-wrap">
                                                    {m.sampleValues.slice(0, 3).map((v, i) => (
                                                        <span key={i} className="text-[10px] font-mono text-secondary bg-header px-1.5 py-0.5 rounded max-w-[120px] truncate border border-border">
                                                            {v || "—"}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <ArrowRight className="w-4 h-4 text-secondary shrink-0 hidden sm:block" />

                                            {/* Dropdown */}
                                            <select
                                                value={m.fieldKey}
                                                onChange={(e) => updateMapping(m.columnIndex, e.target.value as FieldKey | "__skip")}
                                                className={cn(
                                                    "w-full sm:w-48 h-10 rounded-lg border px-3 text-xs font-bold uppercase bg-card focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all",
                                                    isSkipped ? "text-secondary border-border" :
                                                        isRequired ? `${accentText} border-${accent}-300 dark:border-${accent}-500/30` :
                                                            "text-primary border-border"
                                                )}
                                            >
                                                <option value="__skip">— Ignorar —</option>
                                                {fields.map(f => (
                                                    <option key={f.key} value={f.key}>
                                                        {f.label} {f.required ? "✱" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Mapping validation */}
                            {mappingErrors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-3 border border-red-200 dark:border-red-500/20">
                                    <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-1">Campos obligatorios faltantes:</p>
                                    {mappingErrors.map((err, i) => (
                                        <p key={i} className="text-xs font-medium text-red-700 dark:text-red-400">• {err}</p>
                                    ))}
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-2 px-5 py-3 font-bold text-secondary hover:bg-hover rounded-xl border border-border transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Cambiar Archivo
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={mappingErrors.length > 0}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                                        `${accentBg} text-white hover:opacity-90 shadow-lg`
                                    )}
                                >
                                    <Eye className="w-4 h-4" /> Previsualizar Datos
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    ) : (
                        // ─── STEP 3: PREVIEW & CONFIRM ──────────────────────────
                        <div className="p-6 space-y-5">
                            <div className="text-center">
                                <h4 className="text-sm font-black text-primary uppercase tracking-wider flex items-center justify-center gap-2">
                                    <Table2 className="w-4 h-4" />
                                    Paso 3 · Previsualización
                                </h4>
                                <p className="text-xs text-secondary font-medium mt-1">
                                    {rawRows.length} filas serán procesadas. Revisa los datos antes de confirmar.
                                </p>
                            </div>

                            {/* Preview table */}
                            <div className="rounded-xl border border-border overflow-hidden">
                                <div className="overflow-x-auto max-h-[45vh]">
                                    <table className="w-full text-xs">
                                        <thead className="bg-header sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left font-black text-secondary uppercase tracking-wider border-b border-border w-10">#</th>
                                                {mappings.filter(m => m.fieldKey !== "__skip").map(m => {
                                                    const field = fields.find(f => f.key === m.fieldKey)!;
                                                    return (
                                                        <th key={m.columnIndex} className="px-3 py-2.5 text-left font-black text-secondary uppercase tracking-wider border-b border-border whitespace-nowrap">
                                                            {field?.label || m.fieldKey}
                                                            {field?.required && <span className={accentText}> ✱</span>}
                                                        </th>
                                                    );
                                                })}
                                                <th className="px-3 py-2.5 text-left font-black text-secondary uppercase tracking-wider border-b border-border">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {getPreviewRows().map((preview) => (
                                                <tr key={preview.rowIdx} className={cn(
                                                    "transition-colors",
                                                    preview.errors.length > 0 ? "bg-red-50/50 dark:bg-red-500/5" : "hover:bg-hover"
                                                )}>
                                                    <td className="px-3 py-2 text-secondary font-mono">{preview.rowIdx}</td>
                                                    {mappings.filter(m => m.fieldKey !== "__skip").map(m => (
                                                        <td key={m.columnIndex} className="px-3 py-2 text-primary font-medium max-w-[180px] truncate">
                                                            {preview.mapped[m.fieldKey] || <span className="text-secondary">—</span>}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2">
                                                        {preview.errors.length > 0 ? (
                                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                                                                {preview.errors[0]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                                                <Check className="w-2.5 h-2.5" /> OK
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {rawRows.length > 15 && (
                                    <div className="bg-header px-4 py-2 border-t border-border text-center">
                                        <span className="text-[10px] font-bold text-secondary uppercase">
                                            ... y {rawRows.length - 15} filas más
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className={cn("rounded-xl p-4 flex items-center gap-4", accentBgLight)}>
                                <div className={cn("p-2 rounded-lg", accentBg)}>
                                    <FileUp className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className={cn("text-sm font-black uppercase", accentText)}>
                                        {mode === "catalog" ? `${rawRows.length} productos para crear/actualizar` :
                                            mode === "purchase" ? `Compra de ${rawRows.length} líneas de productos` :
                                                `${rawRows.length} líneas de saldo inicial`
                                        }
                                    </p>
                                    <p className="text-[10px] text-secondary font-medium">
                                        {file?.name} — {(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB
                                    </p>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-5 py-3 font-bold text-secondary hover:bg-hover rounded-xl border border-border transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Ajustar Mapeo
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isProcessing}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase tracking-wider transition-all disabled:opacity-60",
                                        `${accentBg} text-white hover:opacity-90 shadow-xl`
                                    )}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Importar {rawRows.length} Registros
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
