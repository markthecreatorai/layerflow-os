import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      "https://layerflow-os-lucaslcarrijos-projects.vercel.app",
  ),
  title: "Layerflow OS",
  description: "O sistema operacional da sua marca pessoal.",
  openGraph: {
    title: "Layerflow OS",
    description: "O sistema operacional da sua marca pessoal.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Layerflow OS",
    description: "O sistema operacional da sua marca pessoal.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
