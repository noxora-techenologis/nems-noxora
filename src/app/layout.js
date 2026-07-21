import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata = {
  title: 'NEMS - نظام إدارة نوكسورا تكنولوجيز',
  description: 'نظام إدارة موارد المؤسسات المتقدم لشركة نوكسورا تكنولوجيز',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  keywords: "NEMS, Noxora, Enterprise, Management, نوكسورا",
  authors: [{ name: "Noxora Technologies" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
