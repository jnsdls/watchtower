import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell, buildHubBadge } from "../dashboard/app-shell";
import { themeInitScript } from "../dashboard/theme/init-script";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the stored or system theme synchronously to avoid a flash. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, build-time constant
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <AppShell
        hubBadge={buildHubBadge({
          HOSTNAME: process.env.HOSTNAME,
          PORT: process.env.PORT,
          WATCHTOWER_PORT: process.env.WATCHTOWER_PORT,
        })}
      >
        {children}
      </AppShell>
    </html>
  );
}
