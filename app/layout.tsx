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
      images: [{ url: "/og.png", width: 1672, height: 941, alt: "Our Place — A warm abstract family circle in rose, sage, water, and gold" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Our Place — A warm place to stay close",
      description: "Helping families listen, understand, and stay close.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
