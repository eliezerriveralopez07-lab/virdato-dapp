"use client";

import { useEffect, useState } from "react";

const TOKEN = {
  address: "0xAEAc353180809F99437c4F9F23aE9204cA6A123B",
  symbol: "VIRD",
  decimals: 18,
  image:
    "https://raw.githubusercontent.com/eliezerriveralopez07-lab/virdato/main/assets/virdato_icon_256.png",
  basescan:
    "https://basescan.org/token/0xaeac353180809f99437c4f9f23ae9204ca6a123b",
};

export default function AddVirdUniversal() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    // MetaMask sometimes injects after initial render; poll briefly
    const check = () => setHasWallet(!!(window as any)?.ethereum?.request);
    check();
    const t = setInterval(check, 500);
    const stop = setTimeout(() => clearInterval(t), 5000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(TOKEN.address);
    setMsg("Contract address copied.");
    setTimeout(() => setMsg(""), 2000);
  };

  const add = async () => {
    const ethereum = (window as any)?.ethereum;

    setMsg("");
    setLoading(true);

    try {
      if (!ethereum?.request) {
        setMsg(
          "No injected wallet detected in this browser/tab. Open this site in MetaMask/Rabby browser or enable the extension, then try again. You can still copy the contract and import manually."
        );
        return;
      }

      const ok = await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: TOKEN.address,
            symbol: TOKEN.symbol,
            decimals: TOKEN.decimals,
            image: TOKEN.image,
          },
        },
      });

      setMsg(ok ? "VIRD added to your wallet." : "Request declined.");
    } catch (e) {
      console.error(e);
      setMsg(
        "Wallet doesn't support auto-add. Use Import Token and paste the contract address."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 mt-6">
      <div className="text-sm font-semibold">Add VIRD to any wallet</div>

      <div className="mt-3 text-xs break-all">
        Contract: <span className="font-mono">{TOKEN.address}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={copy}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          Copy Address
        </button>

        <button
          onClick={add}
          disabled={loading}
          className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
          title={
            hasWallet
              ? "Add token to wallet"
              : "No injected wallet detected in this tab"
          }
        >
          {loading ? "Adding..." : "Add VIRD to Wallet"}
        </button>

        <a
          href={TOKEN.basescan}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          View on BaseScan
        </a>
      </div>

      {!hasWallet && (
        <div className="mt-3 text-xs text-amber-700">
          No wallet detected in this tab. If you’re using MetaMask, make sure the
          extension is enabled and allowed on this site, then refresh.
        </div>
      )}

      {msg && <div className="mt-3 text-xs text-neutral-500">{msg}</div>}
    </div>
  );
}