"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function ConnectWallet({
  onConnect,
}: {
  onConnect: (address: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Not connected");

  function getMetaMaskProvider() {
    const eth = window.ethereum;
    if (!eth) return null;

    if (eth.providers && Array.isArray(eth.providers)) {
      return eth.providers.find((p: any) => p.isMetaMask) || null;
    }

    if (eth.isMetaMask) return eth;

    return null;
  }

  useEffect(() => {
    setMounted(true);

    async function checkConnection() {
      try {
        if (typeof window === "undefined") return;

        const provider = getMetaMaskProvider();
        if (!provider) return;

        const accounts = await provider.request({
          method: "eth_accounts",
        });

        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setStatus("Connected");
          onConnect(accounts[0]);
        }
      } catch (err) {
        console.error("Initial wallet check failed:", err);
      }
    }

    checkConnection();
  }, [onConnect]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const provider = getMetaMaskProvider();
    if (!provider || !provider.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setStatus("Connected");
        setError("");
        onConnect(accounts[0]);
      } else {
        setAddress("");
        setStatus("Not connected");
        onConnect("");
      }
    };

    provider.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [onConnect]);

  async function connect() {
    try {
      setError("");
      setStatus("Trying to connect...");

      if (typeof window === "undefined") {
        setError("Window is undefined");
        setStatus("Window undefined");
        return;
      }

      const provider = getMetaMaskProvider();

      if (!provider) {
        setError("MetaMask not detected");
        setStatus("MetaMask not detected");
        return;
      }

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setStatus("Connected");
        onConnect(accounts[0]);
      } else {
        setError("No accounts returned");
        setStatus("No accounts returned");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to connect wallet");
      setStatus("Connection failed");
    }
  }

  if (!mounted) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={connect} style={{ padding: 10 }}>
        Connect Wallet
      </button>

      <p style={{ marginTop: 10 }}>
        <strong>Status:</strong> {status}
      </p>

      {address && (
        <p style={{ marginTop: 10 }}>
          <strong>Connected:</strong> {address}
        </p>
      )}

      {error && (
        <p style={{ marginTop: 10, color: "red" }}>
          {error}
        </p>
      )}
    </div>
  );
}