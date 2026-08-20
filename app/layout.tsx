import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://layerflow-os.lucascarrijo-contato.chatgpt.site"),
  title: "Layerflow OS",
  description: "O sistema operacional da sua marca pessoal.",
  openGraph: {
    title: "Layerflow OS",
    description: "O sistema operacional da sua marca pessoal.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Layerflow OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Layerflow OS",
    description: "O sistema operacional da sua marca pessoal.",
    images: ["/og.png"],
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
