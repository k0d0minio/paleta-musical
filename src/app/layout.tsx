import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import ptPT from "@/i18n/messages/pt-PT.json";
import { AppShell, Providers } from "@/shell";
import "./globals.css";

const font = Geist({ variable: "--font-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: ptPT.app.name, template: `%s · ${ptPT.app.name}` },
  description: ptPT.app.tagline,
  applicationName: ptPT.app.name,
  appleWebApp: { capable: true, title: ptPT.app.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#101216" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" suppressHydrationWarning className={`${font.variable} antialiased`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
