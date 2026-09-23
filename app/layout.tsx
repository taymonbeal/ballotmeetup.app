import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// VERCEL_PROJECT_PRODUCTION_URL is set in every Vercel environment (including
// previews) and points at the production domain, which crawlers can reach even
// when individual deployment URLs are behind Deployment Protection.
const defaultUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Ballot Meetup",
  description:
    "Run a ballot meetup: discuss each race together and vote on which candidates to recommend.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-svh flex-col items-center">
            <SiteHeader />
            <main className="flex w-full flex-1 justify-center">{children}</main>
            <footer className="flex w-full justify-center border-t border-t-foreground/10 p-5 text-xs text-muted-foreground">
              This app was built mostly by AI.
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
