"use client";

import { useState } from "react";

const VIRD_ADDRESS = "0xAEAc353180809F99437c4F9F23aE9204cA6A123B";
const VIRD_SYMBOL = "VIRD";
const VIRD_DECIMALS = 18;
const VIRD_IMAGE =
  "https://raw.githubusercontent.com/eliezerriveralopez07-lab/virdato/main/assets/virdato_icon_256.png";

// Base mainnet
const BASE_CHAIN_ID_DEC = 8453;
const BASE_CHAIN_ID_HEX = "0x2105";
const BASE_RPC_URL = "https://mainnet.base.org";
const BASE_EXPLORER = "https://basescan.org";

export default function AddVirdButton() {
  const [loading, setLoading] = useState(false);

  const addVird = async () => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.request) {
      alert("No wallet detected. Install MetaMask (or a compatible wallet).");
      return;
    }

    try {
      setLoading(true);

      // Try to switch to Base (preferred)
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
      } catch (err: any) {
        // If Base isn't added to the wallet, add it
        if (err?.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_CHAIN_ID_HEX,
                chainName: "Base",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: [BASE_RPC_URL],
                blockExplorerUrls: [BASE_EXPLORER],
              },
            ],
          });
        } else {
          // User rejected or other issue; continue and try to add token anyway
          console.warn("wallet_switchEthereumChain failed:", err);
        }
      }

      const ok = await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: VIRD_ADDRESS,
            symbol: VIRD_SYMBOL,
            decimals: VIRD_DECIMALS,
            image: VIRD_IMAGE,
          },
        },
      });

      if (ok) alert("VIRD added to your wallet.");
      else alert("Token add request was declined.");
    } catch (e) {
      console.error(e);
      alert("Failed to add token. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={addVird}
      disabled={loading}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
      title="Adds VIRD to your wallet (Base mainnet)"
    >
      {loading ? "Adding…" : "Add VIRD to Wallet"}
    </button>
  );
}