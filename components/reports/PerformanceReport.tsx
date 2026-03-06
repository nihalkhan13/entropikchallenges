"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Award, Zap, Calendar, TrendingUp, Share2, Download } from "lucide-react"
import { Card } from "@/components/ui/Card"
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
}

export function PerformanceReport({ stats }: { stats: ReportStats }) {
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        script.async = true
        document.head.appendChild(script)
        return () => {
            document.head.removeChild(script)
        }
    }, [])

    const handleExport = async (type: 'download' | 'share') => {
        if (!reportRef.current || !window.html2canvas) return

        try {
            const canvas = await window.html2canvas(reportRef.current, {
                backgroundColor: '#0f1115',
                scale: 2,
            })

            const image = canvas.toDataURL("image/png")

            if (type === 'download') {
                const link = document.createElement('a')
                link.href = image
                link.download = `entropik-report-${stats.userName}.png`
                link.click()
            } else if (navigator.share) {
                const blob = await (await fetch(image)).blob()
                const file = new File([blob], 'report.png', { type: 'image/png' })
                await navigator.share({
                    files: [file],
                    title: 'My Entropik Performance',
                    text: `I finished the 30-day squat challenge with a ${stats.completionRate}% completion rate! #StayHard`
                })
            }
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

            {/* The actual exportable card */}
            <div ref={reportRef} className="relative aspect-[9/16] w-full max-w-[320px] mx-auto bg-[#0f1115] rounded-[32px] overflow-hidden border border-white/10 p-8 flex flex-col justify-between shadow-2xl">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="z-10 space-y-8">
                    <div className="flex flex-col items-center">
                        <img src="/logo.png" alt="ENTROPIK" className="h-16 w-auto mb-2 opacity-80" />
                        <div className="h-px w-12 bg-brand-teal/30 mb-8" />

                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase text-center leading-none">
                            Performance<br /><span className="text-brand-teal">Report</span>
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <StatRow label="Completion" value={`${stats.completionRate}%`} icon={<TrendingUp className="w-4 h-4" />} />
                        <StatRow label="Total Days" value={stats.totalDays.toString()} icon={<Calendar className="w-4 h-4" />} />
                        <StatRow label="Longest Streak" value={`${stats.longestStreak} Days`} icon={<Zap className="w-4 h-4" />} color="teal" />
                        <StatRow label="Squad Rank" value={`#${stats.rank}`} icon={<Award className="w-4 h-4" />} />
                    </div>
                </div>

                <div className="z-10 text-center space-y-4">
                    <div className="py-4 bg-brand-glass border border-brand-glass-border rounded-2xl backdrop-blur-md">
                        <p className="text-[10px] text-brand-gray uppercase tracking-widest font-bold mb-1">Status</p>
                        <p className="text-xl font-black text-white italic">ELITE ATHLETE</p>
                    </div>
                    <p className="text-xs text-brand-gray/40 font-medium">ENTROPIK.CO / CHALLENGES</p>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button onClick={() => handleExport('share')} className="flex-1 gap-2" variant="primary">
                    <Share2 className="w-4 h-4" /> Share Story
                </Button>
                <Button onClick={() => handleExport('download')} className="aspect-square p-0" variant="secondary">
                    <Download className="w-5 h-5" />
                </Button>
            </div>
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
