"use client"

import { useRef, useEffect, useState, ReactNode } from "react"
import { Award, Zap, Calendar, TrendingUp, Download, Loader2 } from "lucide-react"
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
    const [scriptReady, setScriptReady] = useState(false)
    const [downloading, setDownloading] = useState(false)

    // Load html2canvas and mark ready on load
    useEffect(() => {
        if (typeof window.html2canvas === 'function') { setScriptReady(true); return }
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        script.async = true
        script.onload = () => setScriptReady(true)
        script.onerror = () => console.error('html2canvas failed to load')
        document.head.appendChild(script)
        return () => { if (document.head.contains(script)) document.head.removeChild(script) }
    }, [])

    const handleDownload = async () => {
        if (!reportRef.current) return
        if (!scriptReady || typeof window.html2canvas !== 'function') {
            alert('Still loading — please try again in a moment.')
            return
        }

        setDownloading(true)
        try {
            const canvas = await window.html2canvas(reportRef.current, {
                backgroundColor: '#0f1115',
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
            })

            const filename = `entropik-report-${stats.userName.replace(/\s+/g, '-')}.png`

            // Primary: blob + object URL (works on desktop + Android Chrome)
            if (canvas.toBlob) {
                canvas.toBlob((blob) => {
                    if (!blob) { fallbackOpen(canvas); return }
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = filename
                    link.style.display = 'none'
                    document.body.appendChild(link)
                    link.click()
                    // Small delay to ensure the browser registers the click
                    setTimeout(() => {
                        document.body.removeChild(link)
                        URL.revokeObjectURL(url)
                    }, 3000)
                }, 'image/png')
            } else {
                fallbackOpen(canvas)
            }
        } catch (err) {
            console.error('Export failed', err)
            alert('Download failed. Please take a screenshot instead.')
        } finally {
            setDownloading(false)
        }
    }

    // Fallback for iOS Safari: open the image in a new tab so the user can
    // long-press → "Add to Photos" / "Save Image"
    const fallbackOpen = (canvas: HTMLCanvasElement) => {
        const dataURL = canvas.toDataURL('image/png')
        const w = window.open('', '_blank')
        if (w) {
            w.document.write(`
                <html><body style="margin:0;background:#0f1115;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <img src="${dataURL}" style="max-width:100%;border-radius:24px;" />
                <p style="position:fixed;bottom:20px;left:0;right:0;text-align:center;color:#aaa;font-family:sans-serif;font-size:12px;">
                    Long-press the image → Save to Photos
                </p>
                </body></html>
            `)
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
            {/* All colors use explicit hex/rgba so html2canvas captures them correctly */}
            <div
                ref={reportRef}
                className="relative w-full max-w-[320px] mx-auto rounded-[32px] overflow-hidden shadow-2xl"
                style={{ aspectRatio: '9/16', background: '#0f1115', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                {/* Layout container fills the card — evenly spaced top-to-bottom */}
                <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '40px 32px' }}>
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32"
                        style={{ background: 'rgba(93,255,221,0.08)', filter: 'blur(80px)' }} />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full -ml-32 -mb-32"
                        style={{ background: 'rgba(93,255,221,0.04)', filter: 'blur(80px)' }} />

                    {/* ── Logo ── */}
                    <div className="z-10 flex flex-col items-center text-center">
                        {/* crossOrigin needed so html2canvas can read the image */}
                        <img
                            src="/logo.png"
                            alt="ENTROPIK"
                            crossOrigin="anonymous"
                            style={{ height: '56px', width: 'auto', opacity: 0.8 }}
                        />
                    </div>

                    {/* ── Report title + challenge name ── */}
                    <div className="z-10 text-center">
                        <div style={{ height: '1px', width: '48px', background: 'rgba(93,255,221,0.3)', margin: '0 auto 12px' }} />
                        <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.05em', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
                            Performance<br /><span style={{ color: '#5dffdd' }}>Report</span>
                        </h2>
                        <p style={{ color: '#5dffdd', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 700, marginTop: '12px' }}>
                            30 Day Plank Challenge
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', marginTop: '4px' }}>
                            Day {stats.currentDay}
                        </p>
                    </div>

                    {/* ── Stats ── */}
                    <div className="z-10" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <InlineStatRow label="Completion"  value={`${stats.completionRate}%`}    teal={false} icon={<TrendingUp size={16} color="#888888" strokeWidth={2.5} />} />
                        <InlineStatRow label="Total Days"  value={stats.totalDays.toString()}     teal={false} icon={<Calendar   size={16} color="#888888" strokeWidth={2.5} />} />
                        <InlineStatRow label="Best Streak" value={`${stats.longestStreak} Days`}  teal={true}  icon={<Zap        size={16} color="#5dffdd" strokeWidth={2.5} />} />
                        <InlineStatRow label="Squad Rank"  value={`#${stats.rank}`}               teal={false} icon={<Award      size={16} color="#888888" strokeWidth={2.5} />} />
                    </div>

                    {/* ── Footer URL ── */}
                    <div className="z-10 text-center">
                        <p style={{ color: 'rgba(170,170,170,0.4)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            challenges.entropik.co
                        </p>
                    </div>
                </div>
            </div>

            {/* Download button */}
            <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full gap-2"
                variant="secondary"
            >
                {downloading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Download Report</>
                }
            </Button>

            {/* iOS hint shown while downloading */}
            {downloading && (
                <p className="text-center text-brand-gray/40 text-xs">
                    If a new tab opens, long-press the image → Save to Photos
                </p>
            )}
        </div>
    )
}

// Inline-styled stat row so html2canvas captures it reliably (no CSS variables)
function InlineStatRow({ label, value, teal, icon }: { label: string; value: string; teal: boolean; icon: ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', border: '1px solid',
                    background: teal ? 'rgba(93,255,221,0.15)' : 'rgba(255,255,255,0.05)',
                    borderColor: teal ? 'rgba(93,255,221,0.3)' : 'rgba(255,255,255,0.1)',
                }}>
                    {icon}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: teal ? '#5dffdd' : '#ffffff' }}>
                {value}
            </span>
        </div>
    )
}
