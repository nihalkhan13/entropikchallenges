import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, hover, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "glass-panel rounded-2xl p-6 transition-colors",
                    hover && "hover:bg-white/[0.03] hover:border-white/10",
                    className
                )}
                {...props}
            />
        )
    }
)
Card.displayName = "Card"

export { Card }
