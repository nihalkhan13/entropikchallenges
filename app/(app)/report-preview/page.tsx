
'use client'

import { PerformanceReport } from "@/components/reports/PerformanceReport"
import { motion } from "framer-motion"

export default function ReportPreviewPage() {
    const mockStats = {
        totalDays: 28,
        missedDays: 2,
        longestStreak: 15,
        completionRate: 93,
        rank: 12,
        userName: "VERIFICATION BOT",
        currentDay: 30,
    }

    return (
        <div className="min-h-screen bg-brand-black p-4 py-8">
            <div className="max-w-md mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <h1 className="text-2xl font-bold text-white mb-2">REPORT PREVIEW</h1>
                    <p className="text-brand-gray/60 text-sm">Visualizing the end-of-challenge summary</p>
                </motion.div>

                <PerformanceReport
                    stats={mockStats}
                />

                <div className="text-center pt-8">
                    <p className="text-xs text-brand-gray/40 italic uppercase tracking-widest">
                        Entropik Performance Lab • Verified
                    </p>
                </div>
            </div>
        </div>
    )
}
