import Link from "next/link";
import type { ReactNode } from "react";
import { themeInitScript } from "../dashboard/theme/init-script";
import { ThemeToggle } from "../dashboard/theme/theme-toggle";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the stored or system theme synchronously to avoid a flash. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, build-time constant
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="bg-background text-foreground">
        <div className="border-border border-b bg-card">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <Link className="font-semibold text-foreground text-sm" href="/">
              watchtower
            </Link>
            <ThemeToggle />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
