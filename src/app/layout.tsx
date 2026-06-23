import type { Metadata } from "next";
import { Toaster } from "@/app/components/ui/sonner";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "PWA Sistema POS e Inventario",
  description: "A user-friendly POS and inventory management system designed for small and medium businesses in El Salvador, seamlessly integrating with external electronic invoicing systems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="root">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
