import type { Metadata } from "next";
import "@/styles/globals.css";
import ElectronTitleBar from "@/components/layout/ElectronTitleBar";

export const metadata: Metadata = {
  title: "Hackmanite",
  description:
    "Explore extracted entities as an interactive knowledge graph. Discover connections between persons, organizations, locations, and more.",
  keywords: ["hackmanite", "entity graph", "NLP", "data lake", "knowledge graph", "NER", "OSINT", "Graph analysis", "Information Extraction"],
  icons: {
    icon: "/hackmanite_nobg.png",
    shortcut: "/hackmanite_nobg.png",
    apple: "/hackmanite_nobg.png",
  },
  openGraph: {
    title: "Hackmanite",
    description: "Interactive entity relationship graph built from heterogeneous data.",
    type: "website",
    images: [{ url: "/hackmanite_main_icon.png", width: 512, height: 512 }],
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
