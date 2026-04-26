import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPer — Turn Any API into an MCP Server",
  description:
    "MCPer converts OpenAPI / Swagger specs into fully functional FastMCP servers. Paste your API URLs, generate MCP tools instantly, and plug them into any AI agent.",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "OpenAPI",
    "FastMCP",
    "API to MCP",
    "AI tools",
  ],
  openGraph: {
    title: "MCPer — Turn Any API into an MCP Server",
    description:
      "Convert OpenAPI specs into FastMCP servers instantly. No boilerplate, just plug and play.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Oswald:wght@200..700&family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
