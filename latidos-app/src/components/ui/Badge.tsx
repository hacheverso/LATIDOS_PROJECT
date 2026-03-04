import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-card text-primary hover:bg-card",
                secondary:
                    "border-transparent bg-header text-primary hover:bg-hover/80",
                destructive:
                    "border-transparent bg-red-500 text-primary hover:bg-red-500/80",
                outline: "text-slate-950",
                success:
                    "border-transparent bg-brand text-inverse text-white hover:opacity-90",
                warning:
                    "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
