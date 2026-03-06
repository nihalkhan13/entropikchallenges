import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "glass" | "danger" | "ghost"
    size?: "sm" | "md" | "lg" | "icon"
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",

                    // Variants
                    variant === "primary" &&
                    "bg-brand-teal text-brand-dark shadow-[0_0_20px_rgba(93,255,221,0.3)] hover:bg-[#4beeca] hover:shadow-[0_0_30px_rgba(93,255,221,0.5)] border border-transparent",

                    variant === "secondary" &&
                    "bg-brand-glass text-white border border-brand-glass-border hover:bg-white/10 hover:border-white/20",

                    variant === "glass" &&
                    "glass-panel text-white hover:bg-white/10 hover:border-white/20",

                    variant === "danger" &&
                    "bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error/20",

                    variant === "ghost" &&
                    "bg-transparent text-brand-gray hover:text-white hover:bg-white/5",

                    // Sizes
                    size === "sm" && "h-9 px-4 text-sm",
                    size === "md" && "h-12 px-6 text-base",
                    size === "lg" && "h-14 px-8 text-lg font-semibold",
                    size === "icon" && "h-10 w-10",

                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
