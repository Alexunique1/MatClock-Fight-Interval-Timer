import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID ?? "G-V84PVCSJ2P";

export const metadata: Metadata = {
  title: "MatClock Fight Interval Timer",
  description:
    "A free fight interval timer for boxing, MMA, Muay Thai, HIIT, and combat training.",
  applicationName: "MatClock",
  metadataBase: new URL("https://matclock.online"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MatClock Fight Interval Timer",
    description:
      "A free fight interval timer with rounds, rest, warning signals, and PWA install support.",
    url: "https://matclock.online",
    siteName: "MatClock",
    images: [
      {
        url: "/images/logo.png",
        width: 343,
        height: 399,
        alt: "MatClock logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MatClock Fight Interval Timer",
    description: "A free fight interval timer for combat sports training.",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: [
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4725828010051228"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        {googleAnalyticsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
