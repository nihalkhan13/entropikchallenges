"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Award, Zap, Calendar, TrendingUp, Download } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>
  }
}

interface ReportStats {
    completionRate: number
    totalDays: number
    missedDays: number
    longestStreak: number
    rank: number
    userName: string
    currentDay: number
}

export function PerformanceReport({ stats }: { stats: ReportStats }) {
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        script.async = true
        document.head.appendChild(script)
        return () => {
            if (document.head.contains(script)) document.head.removeChild(script)
        }
    }, [])

    const handleDownload = async () => {
        if (!reportRef.current || !window.html2canvas) return

        try {
            const canvas = await window.html2canvas(reportRef.current, {
                backgroundColor: '#0f1115',
                scale: 2,
                useCORS: true,
            })

            const image = canvas.toDataURL("image/png")
            const link = document.createElement('a')
            link.href = image
            link.download = `entropik-report-${stats.userName}.png`
            link.click()
        } catch (err) {
            console.error("Export failed", err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-4 bg-brand-teal/10 border border-brand-teal/20 rounded-2xl">
                <p className="text-brand-teal text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                    <Award className="w-4 h-4" /> Challenge Accomplished
                </p>
            </div>

            {/* The actual exportable card — strict 9:16 portrait */}
            <div
                ref={reportRef}
                className="relative w-full max-w-[320px] mx-auto bg-[#0f1115] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl"
                style={{ aspectRatio: '9/16' }}
            >
                {/* Layout container fills the card */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                    {/* Top section */}
                    <div className="z-10 space-y-8">
                        <div className="flex flex-col items-center text-center">
                            <img src="/logo.png" alt="ENTROPIK" className="h-16 w-auto mb-3 opacity-80" />
                            <div className="h-px w-12 bg-brand-teal/30 mb-3" />
                            {/* Challenge name + day number */}
                            <p className="text-brand-teal text-[10px] uppercase tracking-[0.25em] font-bold">
                                30 Day Plank Challenge
                            </p>
                            <p className="text-white/60 text-xs font-semibold tracking-widest mt-0.5">
                                Day {stats.currentDay}
                            </p>
                            <div className="mt-5">
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase text-center leading-none">
                                    Performance<br /><span className="text-brand-teal">Report</span>
                                </h2>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <StatRow label="Completion" value={`${stats.completionRate}%`} icon={<TrendingUp className="w-4 h-4" />} />
                            <StatRow label="Total Days" value={stats.totalDays.toString()} icon={<Calendar className="w-4 h-4" />} />
                            <StatRow label="Longest Streak" value={`${stats.longestStreak} Days`} icon={<Zap className="w-4 h-4" />} color="teal" />
                            <StatRow label="Squad Rank" value={`#${stats.rank}`} icon={<Award className="w-4 h-4" />} />
                        </div>
                    </div>

                    {/* Bottom section */}
                    <div className="z-10 text-center space-y-4">
                        <div className="py-4 bg-brand-glass border border-brand-glass-border rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] text-brand-gray uppercase tracking-widest font-bold mb-1">Status</p>
                            <p className="text-xl font-black text-white italic">ELITE ATHLETE</p>
                        </div>
                        <p className="text-xs text-brand-gray/40 font-medium">challenges.entropik.co</p>
                    </div>
                </div>
            </div>

            {/* Download button only */}
            <Button
                onClick={handleDownload}
                className="w-full gap-2"
                variant="secondary"
            >
                <Download className="w-4 h-4" /> Download Report
            </Button>
        </div>
    )
}

function StatRow({ label, value, icon, color = "gray" }: { label: string, value: string, icon: React.ReactNode, color?: "gray" | "teal" }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    color === "teal" ? "bg-brand-teal/20 border-brand-teal/30 text-brand-teal" : "bg-white/5 border-white/10 text-brand-gray"
                )}>
                    {icon}
                </div>
                <span className="text-sm font-bold text-brand-gray uppercase tracking-tight">{label}</span>
            </div>
            <span className={cn(
                "text-xl font-black italic",
                color === "teal" ? "text-brand-teal" : "text-white"
            )}>{value}</span>
        </div>
    )
}
