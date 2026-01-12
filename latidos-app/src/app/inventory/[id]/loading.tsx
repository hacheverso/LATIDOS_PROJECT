import { Skeleton } from "../../../components/ui/skeleton"

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-20">

            {/* 1. HUD HEADER SKELETON */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Image & Specs */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-6 items-start">
                    <Skeleton className="w-32 h-32 md:w-48 md:h-48 rounded-xl" />
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-24 rounded-md" />
                            <Skeleton className="h-6 w-32 rounded-md" />
                        </div>
                        <Skeleton className="h-12 w-3/4 rounded-lg" />
                        <div className="flex gap-4">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-full mt-4 rounded-lg" />
                </div>
            </div>

            {/* 2. METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm h-24 flex flex-col justify-center space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>

            {/* 3. CHART SKELETON */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-64 flex flex-col">
                <div className="flex justify-between mb-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="flex-1 w-full rounded-xl" />
            </div>

            {/* 4. DETAILS SKELETON */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-8 h-64">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-40" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
