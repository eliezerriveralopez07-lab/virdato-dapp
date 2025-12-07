"use client";

import { ReactNode } from "react";
import { WagmiProvider as BaseWagmiProvider, createConfig, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

console.log(
  "RPC URL from env:",
  process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_AMOY_URL
);

const config = createConfig({
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_AMOY_URL as string
    ),
  },
});

const queryClient = new QueryClient();

// ✅ DEFAULT EXPORT named WagmiProvider – this matches <WagmiProvider> in layout.tsx
export default function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <BaseWagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BaseWagmiProvider>
  );
}


