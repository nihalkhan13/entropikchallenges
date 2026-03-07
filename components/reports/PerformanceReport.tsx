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

            // Use toBlob + createObjectURL for better cross-platform save dialog support
            canvas.toBlob((blob) => {
                if (!blob) return
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `entropik-report-${stats.userName}.png`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                // Revoke after a short delay to ensure download has started
                setTimeout(() => URL.revokeObjectURL(url), 2000)
            }, 'image/png')
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
                {/* Layout container fills the card — evenly spaced top-to-bottom */}
                <div className="absolute inset-0 px-8 py-10 flex flex-col justify-between">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                    {/* ── Logo ── */}
                    <div className="z-10 flex flex-col items-center text-center">
                        <img src="/logo.png" alt="ENTROPIK" className="h-14 w-auto opacity-80" />
                    </div>

                    {/* ── Report title + challenge name ── */}
                    <div className="z-10 text-center space-y-2">
                        <div className="h-px w-12 bg-brand-teal/30 mx-auto mb-3" />
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                            Performance<br /><span className="text-brand-teal">Report</span>
                        </h2>
                        <p className="text-brand-teal text-[10px] uppercase tracking-[0.25em] font-bold mt-3">
                            30 Day Plank Challenge
                        </p>
                        <p className="text-white/50 text-[10px] font-semibold tracking-widest">
                            Day {stats.currentDay}
                        </p>
                    </div>

                    {/* ── Stats ── */}
                    <div className="z-10 space-y-5">
                        <StatRow label="Completion"    value={`${stats.completionRate}%`}          icon={<TrendingUp className="w-4 h-4" />} />
                        <StatRow label="Total Days"    value={stats.totalDays.toString()}           icon={<Calendar className="w-4 h-4" />} />
                        <StatRow label="Best Streak"   value={`${stats.longestStreak} Days`}        icon={<Zap className="w-4 h-4" />} color="teal" />
                        <StatRow label="Squad Rank"    value={`#${stats.rank}`}                     icon={<Award className="w-4 h-4" />} />
                    </div>

                    {/* ── Footer URL ── */}
                    <div className="z-10 text-center">
                        <p className="text-xs text-brand-gray/40 font-medium tracking-widest uppercase">
                            challenges.entropik.co
                        </p>
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
