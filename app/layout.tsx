import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://still-here-family-checkin.georgej.chatgpt.site"),
  title: "Our Place — A warm place to stay close",
  description: "A warm place for older adults to share their days and for families to stay close.",
  icons: {
    icon: "/still-here-family-mark.png",
    apple: "/still-here-family-mark.png",
  },
  openGraph: {
    title: "Our Place — A warm place to stay close",
    description: "Helping families listen, understand, and stay close.",
    images: [{ url: "/still-here-family-mark.png", width: 768, height: 768, alt: "Four generations held together in a circle of changing light" }],
  },
  twitter: {
    card: "summary",
    title: "Our Place — A warm place to stay close",
    description: "Helping families listen, understand, and stay close.",
    images: ["/still-here-family-mark.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
