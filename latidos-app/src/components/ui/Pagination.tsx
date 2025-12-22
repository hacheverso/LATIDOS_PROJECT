import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (perPage: number) => void;
    pageSizeOptions?: number[];
}

export function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [10, 25, 50, 100]
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1 && totalItems === 0) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show around current
        const range = [];
        const rangeWithDots = [];

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        let l;
        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push("...");
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2">
            {/* Info Text */}
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Mostrando <span className="text-slate-700">{Math.min(startItem, totalItems)} - {endItem}</span> de <span className="text-slate-700">{totalItems}</span> registros
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                {onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Filas:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="bg-white/50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Pagination Buttons */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    {/* First */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    {/* Prev */}
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Numbers */}
                    <div className="flex items-center px-2 gap-1 hidden sm:flex">
                        {getPageNumbers().map((page, i) => (
                            page === "..." ? (
                                <span key={i} className="text-slate-300 text-xs font-bold px-1">...</span>
                            ) : (
                                <button
                                    key={i}
                                    onClick={() => onPageChange(page as number)}
                                    className={cn(
                                        "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                                        currentPage === page
                                            ? "bg-slate-900 text-white shadow-md"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Small Screen Current Page Indicator */}
                    <div className="sm:hidden text-xs font-bold text-slate-700 px-2">
                        {currentPage} / {totalPages}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Last */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
