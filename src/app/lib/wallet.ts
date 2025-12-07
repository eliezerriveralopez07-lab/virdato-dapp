// src/lib/wallet.ts
import { createConfig, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL as string
    ),
  },
});

