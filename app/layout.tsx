import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ClientLayout from "./ClientLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Police pour le corps de texte
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Police Serif pour l'aspect Luxe / Souverain
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "SOVEREIGN | Rebecca One",
  description: "Elite Personal Operating System",
  manifest: "/manifest.json", // Nécessaire pour les notifications natives
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-midnight text-ivory antialiased selection:bg-gold-500/30">
        <AuthProvider>
          <ProtectedRoute>
            <ClientLayout>
              {children}
            </ClientLayout>
          </ProtectedRoute>
        </AuthProvider>
        
        {/* Système de notifications de luxe */}
        <Toaster 
          theme="dark" 
          position="top-right" 
          expand={false} 
          richColors 
          toastOptions={{
            style: { 
              background: 'rgba(255, 255, 255, 0.05)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              color: '#F5F5F0'
            },
          }}
        />
      </body>
    </html>
  );
}