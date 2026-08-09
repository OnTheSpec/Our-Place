import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

function requestMetadataBase(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  return {
    metadataBase: requestMetadataBase(requestHeaders),
    title: "Our Place — A warm place to stay close",
    description: "A warm place for older adults to share their days and for families to stay close.",
    icons: {
      icon: "/our-place-family-mark.png",
      apple: "/our-place-family-mark.png",
    },
    openGraph: {
      title: "Our Place — A warm place to stay close",
      description: "Helping families listen, understand, and stay close.",
      images: [{ url: "/our-place-family-mark.png", width: 768, height: 768, alt: "Four generations held together in a circle of changing light" }],
    },
    twitter: {
      card: "summary",
      title: "Our Place — A warm place to stay close",
      description: "Helping families listen, understand, and stay close.",
      images: ["/our-place-family-mark.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
