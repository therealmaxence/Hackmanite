import type { Metadata } from "next";
import "@/styles/globals.css";
import ElectronTitleBar from "@/components/layout/ElectronTitleBar";

export const metadata: Metadata = {
  title: "DataLake Entity Graph Explorer",
  description:
    "Upload files from your data lake and explore extracted entities as an interactive knowledge graph. Discover connections between persons, organizations, locations, and more.",
  keywords: ["entity graph", "NLP", "data lake", "knowledge graph", "NER", "OSINT", "Datalake", "Graph analysis", "Information Extraction"],
  icons: {
    icon: "/dagex-nobg.png",
    shortcut: "/dagex-nobg.png",
    apple: "/dagex-nobg.png",
  },
  openGraph: {
    title: "DataLake Entity Graph Explorer",
    description: "Interactive entity relationship graph built from heterogeneous data.",
    type: "website",
    images: [{ url: "/dagex-nobg.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <ElectronTitleBar />
        {children}
      </body>
    </html>
  );
}
