import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "../components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EventEase - Etkinlik Yönetim Platformu",
  description: "Etkinliklerinizi kolayca oluşturun, yönetin ve katılımcıları organize edin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
