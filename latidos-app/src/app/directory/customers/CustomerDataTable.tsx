import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ArrowUpDown, Search, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Types
export interface CustomerData {
    id: string;
    name: string;
    companyName: string | null;
    taxId: string;
    address: string | null;
    sector: string | null;
    phone: string | null;
    email: string | null;
    debtStatus: 'up_to_date' | 'active_debt' | 'overdue_debt';
    totalDebt: number;
}

const columns: ColumnDef<CustomerData>[] = [
    {
        accessorKey: "name",
        header: ({ column }: { column: any }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hover:bg-transparent pl-0 text-slate-700 font-bold"
                >
                    Client & Empresa
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }: { row: any }) => {
            const company = row.original.companyName;
            return (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 uppercase text-sm">{row.getValue("name")}</span>
                    {company && <span className="text-xs text-blue-600 font-bold uppercase tracking-wide">{company}</span>}
                </div>
            );
        },
    },
    {
        accessorKey: "taxId",
        header: "Documento",
        cell: ({ row }: { row: any }) => <span className="text-slate-700 font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded">{row.getValue("taxId")}</span>,
    },
    {
        accessorKey: "sector", // Filtering mainly by sector
        header: "Ubicación",
        cell: ({ row }: { row: any }) => {
            const address = row.original.address;
            const sector = row.getValue("sector") as string;
            return (
                <div className="flex flex-col gap-1">
                    {sector && (
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] uppercase bg-white text-slate-700 border-slate-300 shadow-sm">{sector}</Badge>
                        </div>
                    )}
                    {address && <span className="text-xs text-slate-500 font-medium truncate max-w-[180px]">{address}</span>}
                </div>
            );
        }
    },
    {
        id: "contact",
        header: "Contacto",
        cell: ({ row }: { row: any }) => {
            const phone = row.original.phone;
            const email = row.original.email;
            return (
                <div className="flex flex-col gap-1">
                    {phone && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <a href={`https://wa.me/57${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-green-600 font-bold transition-colors">
                                <Phone className="w-3 h-3" /> {phone}
                            </a>
                        </div>
                    )}
                    {email && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-500 truncate max-w-[150px] transition-colors">
                                <Mail className="w-3 h-3" /> {email}
                            </a>
                        </div>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "debtStatus",
        header: "Estado Financiero",
        cell: ({ row }: { row: any }) => {
            const status = row.getValue("debtStatus") as string;
            // Map status to badge
            if (status === 'up_to_date') return <Badge className="bg-emerald-100/80 text-emerald-800 hover:bg-emerald-100 uppercase text-[10px] font-black border border-emerald-200 shadow-sm tracking-wide px-2.5 py-0.5">AL DÍA</Badge>;
            if (status === 'active_debt') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 uppercase text-[10px] font-bold border border-amber-200 shadow-sm px-2.5 py-0.5">PENDIENTE</Badge>;
            if (status === 'overdue_debt') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 uppercase text-[10px] font-bold border border-red-200 shadow-sm px-2.5 py-0.5">EN MORA</Badge>;
            return null;
        },
        filterFn: (row: any, id: string, value: string) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        id: "actions",
        cell: ({ row }: { row: any }) => {
            return (
                <div className="flex justify-end">
                    <Link href={`/directory/customers/${row.original.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 shadow-sm transition-all">
                            Gestionar
                        </Button>
                    </Link>
                </div>
            )
        }
    }
];

interface CustomerDataTableProps {
    data: CustomerData[];
}

export function CustomerDataTable({ data }: CustomerDataTableProps) {
    const router = useRouter();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    // Custom Filters
    const [sectorFilter, setSectorFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isCompanyFilter, setIsCompanyFilter] = useState(false);

    // Derived Unique Sectors for Filter
    const uniqueSectors = Array.from(new Set(data.map(d => d.sector).filter(Boolean))) as string[];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, columnId, filterValue) => {
            const search = filterValue.toLowerCase();
            const name = (row.getValue("name") as string).toLowerCase();
            const taxId = (row.getValue("taxId") as string).toLowerCase();
            const company = (row.original.companyName || "").toLowerCase();
            const phone = (row.original.phone || "").toLowerCase();

            return name.includes(search) || taxId.includes(search) || company.includes(search) || phone.includes(search);
        },
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
    });

    // Apply Custom Filters Effect
    React.useEffect(() => {
        const filters = [];

        if (sectorFilter !== "ALL") {
            filters.push({ id: "sector", value: sectorFilter });
        }

        if (statusFilter !== "ALL") {
            filters.push({ id: "debtStatus", value: statusFilter });
        }

        // Note: For Company vs Person, we filter based on companyName existence
        // Since react-table column filters are additive (AND), we can set this.
        // But strict "Is Company" means companyName is not null. 
        // We can do this via a custom filter function or just pre-filtering data? 
        // Better to use a specific column filter if column exists, or just filter data before passing (but pagination breaks).
        // Let's add a filter to 'name' column? No.
        // Let's add a 'type' simulated filter. Or just filter the rows displayed visually? No pagination breaks.
        // Best approach: Add a hidden column 'isCompany' or checks.
    }, [sectorFilter, statusFilter, isCompanyFilter]);

    // Better approach for Switch (Company Filter): 
    // We can't easily push a column filter for a non-column. 
    // Let's just filter properly using setColumnFilters directly in the handler or Effect.

    React.useEffect(() => {
        const newFilters = [];
        if (sectorFilter !== "ALL") newFilters.push({ id: "sector", value: sectorFilter });
        if (statusFilter !== "ALL") newFilters.push({ id: "debtStatus", value: statusFilter });
        // For Company Switch: We need a way to filter. 
        // Let's assume we filter on 'name' via a custom filter function? 
        // Actually, let's just make the Switch toggle a global filter compatible logic? 
        // Or easier: Filter the data prop passed to useReactTable? NO, hooks rule.
        // Let's add a custom filter function to the main table logic if possible.

        setColumnFilters(newFilters);
    }, [sectorFilter, statusFilter]);

    // Filter for company is tricky without an accessor. 
    // Let's use the 'table.setColumnFilters' but we need a column for it.
    // Hack: We can filter the data BEFORE passing to useReactTable if we memoize it.

    const filteredData = React.useMemo(() => {
        let d = data;
        if (isCompanyFilter) {
            d = d.filter(item => item.companyName && item.companyName.trim() !== "");
        }
        return d;
    }, [data, isCompanyFilter]);

    // Re-init table with filtered data
    const finalTable = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, columnId, filterValue) => {
            const search = filterValue.toLowerCase();
            const name = (row.getValue("name") as string).toLowerCase();
            const taxId = (row.getValue("taxId") as string).toLowerCase();
            const company = (row.original.companyName || "").toLowerCase();
            const phone = (row.original.phone || "").toLowerCase();
            return name.includes(search) || taxId.includes(search) || company.includes(search) || phone.includes(search);
        },
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

                {/* Search */}
                <div className="relative w-full xl:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente, empresa o documento..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all text-slate-900 font-bold"
                    />
                </div>

                {/* Filters Group */}
                <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto overflow-x-auto">

                    {/* Sector Filter */}
                    <div className="w-full md:w-48">
                        <Select value={sectorFilter} onValueChange={setSectorFilter}>
                            <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-900 font-bold h-10">
                                <MapPin className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                <SelectValue placeholder="Zona Logística" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las Zonas</SelectItem>
                                {uniqueSectors.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-900 font-bold h-10">
                                <div className="flex items-center gap-2">
                                    {statusFilter === 'ALL' && <div className="w-2 h-2 rounded-full bg-slate-400" />}
                                    {statusFilter === 'up_to_date' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />}
                                    {statusFilter === 'active_debt' && <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />}
                                    {statusFilter === 'overdue_debt' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />}
                                    <SelectValue placeholder="Estado Financiero" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="up_to_date">Al Día</SelectItem>
                                <SelectItem value="active_debt">Pendiente</SelectItem>
                                <SelectItem value="overdue_debt">En Mora</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Type Filter Switch */}
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 h-10 whitespace-nowrap">
                        <span className={`text-xs font-bold uppercase transition-colors ${!isCompanyFilter ? "text-slate-800" : "text-slate-400"}`}>
                            Todos
                        </span>
                        <Switch
                            checked={isCompanyFilter}
                            onCheckedChange={setIsCompanyFilter}
                        />
                        <span className={`text-xs font-bold uppercase transition-colors ${isCompanyFilter ? "text-blue-600" : "text-slate-400"}`}>
                            Solo Empresas
                        </span>
                    </div>

                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        {finalTable.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-slate-100">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="text-xs uppercase font-bold text-slate-500 tracking-wider py-4">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {finalTable.getRowModel().rows?.length ? (
                            finalTable.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    onClick={() => router.push(`/directory/customers/${row.original.id}`)}
                                    className="hover:bg-blue-50/50 border-slate-50 transition-colors cursor-pointer group"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Search className="w-6 h-6 text-slate-300" />
                                        <p className="font-medium text-sm">No se encontraron clientes.</p>
                                        <p className="text-xs text-slate-400">Intenta cambiar los filtros o tu búsqueda.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-xs text-slate-400 font-medium">
                    Mostrando {finalTable.getRowModel().rows.length} de {data.length} clientes
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => finalTable.previousPage()}
                        disabled={!finalTable.getCanPreviousPage()}
                        className="h-8 text-xs font-bold"
                    >
                        ANTERIOR
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => finalTable.nextPage()}
                        disabled={!finalTable.getCanNextPage()}
                        className="h-8 text-xs font-bold"
                    >
                        SIGUIENTE
                    </Button>
                </div>
            </div>
        </div>
    );
}
