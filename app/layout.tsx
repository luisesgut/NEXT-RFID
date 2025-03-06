import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionProviderWrapper from "../components/ui/SessionProviderWrapper"; // 👈 Importa el wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RFID Product Tracker",
  description: "Track RFID products and assign operators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper> {/* ✅ Ahora el SessionProvider está en un componente separado */}
      </body>
    </html>
  );
}
