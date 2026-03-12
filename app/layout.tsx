
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { OneSignalProvider } from "@/components/providers/OneSignalProvider"
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "30 Day Plank Challenge",
  description: "30 Days of Discipline. Lock In.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "30 Day Plank Challenge",
    description: "Can you hold a 2-minute plank every day for 30 days? Join the squad.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "30 Day Plank Challenge",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "30 Day Plank Challenge",
    description: "Can you hold a 2-minute plank every day for 30 days? Join the squad.",
    images: ["/og-image.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased font-sans`} suppressHydrationWarning>
        <ServiceWorkerProvider />
        <AuthProvider>
          <OneSignalProvider>
            {children}
          </OneSignalProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
