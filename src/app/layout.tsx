import "./globals.css";
import type { Metadata } from "next";
import  WagmiProvider from "./components/WagmiProvider";

export const metadata: Metadata = {
  title: "Virdato Dashboard",
  description: "Virdato dApp dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider>{children}</WagmiProvider>
      </body>
    </html>
  );
}

