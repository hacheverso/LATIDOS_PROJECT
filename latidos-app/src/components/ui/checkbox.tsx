"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            type="checkbox"
            ref={ref}
            className={cn(
                "peer h-4 w-4 shrink-0 rounded-sm border border-slate-900 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
