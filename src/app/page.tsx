"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { VIRD_TOKEN_ADDRESS, VIRD_TOKEN_ABI } from "./lib/virdToken";

// Your Virdato logo (GitHub avatar)
const LOGO_URL =
  "https://avatars.githubusercontent.com/u/231290304?s=400&u=480a7c499700a55996429a1b08600e2aabb9fd22&v=4";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    writeContract,
    isPending: txPending,
    data: txHash,
    error: txError,
  } = useWriteContract();

  const injected = mounted ? connectors[0] : undefined;

  const { data: balanceRaw, isLoading: balanceLoading } = useReadContract({
    address: VIRD_TOKEN_ADDRESS,
    abi: VIRD_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: decimals } = useReadContract({
    address: VIRD_TOKEN_ADDRESS,
    abi: VIRD_TOKEN_ABI,
    functionName: "decimals",
  });

  const { data: symbol } = useReadContract({
    address: VIRD_TOKEN_ADDRESS,
    abi: VIRD_TOKEN_ABI,
    functionName: "symbol",
  });

  const prettyBalance =
    balanceRaw && typeof decimals === "number"
      ? formatUnits(balanceRaw as bigint, decimals)
      : "0";

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const handleSend = () => {
    if (!address || !decimals || !to || !amount) return;

    const value = parseUnits(amount, decimals as number);

    writeContract({
      address: VIRD_TOKEN_ADDRESS,
      abi: VIRD_TOKEN_ABI,
      functionName: "transfer",
      args: [to as `0x${string}`, value],
    });
  };

  const connectButtonDisabled = !mounted || isPending || !injected;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "white",
        display: "flex",
        justifyContent: "center",
        paddingTop: "3rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          borderRadius: "16px",
          border: "1px solid #1e293b",
          padding: "24px",
          backgroundColor: "#020617",
        }}
      >
        {/* ================= HEADER WITH LOGO ================= */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Round logo */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                border: "2px solid rgba(251, 191, 36, 0.9)",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
                backgroundColor: "#020617",
              }}
            >
              <img
                src={LOGO_URL}
                alt="Virdato Logo"
                style={{
                  width: "180%",
                  height: "180%",
                  objectFit: "cover",
                  objectPosition: "center",
                  position: "absolute",
                  top: "-40%",
                  left: "0%",
                  display: "block",
                }}
              />
            </div>

            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                Virdato Dashboard
              </h1>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                Manage your Virdato Token (VDT)
              </p>
            </div>
          </div>

          {/* CONNECT BUTTON */}
          <button
            onClick={() => {
              if (!mounted) return;

              if (isConnected) {
                disconnect();
              } else if (injected) {
                connect({ connector: injected });
              }
            }}
            disabled={connectButtonDisabled}
            style={{
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "#22c55e",
              color: "#020617",
              fontWeight: 600,
              opacity: connectButtonDisabled ? 0.6 : 1,
              cursor: connectButtonDisabled ? "default" : "pointer",
              border: "none",
            }}
          >
            {isConnected ? "Disconnect" : "Connect Wallet"}
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        {!mounted ? (
          <p style={{ color: "#94a3b8" }}>Loading wallet...</p>
        ) : !isConnected ? (
          <p style={{ color: "#94a3b8" }}>
            Connect your wallet to view &amp; send Virdato Tokens.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Connected Address */}
            <div>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                Connected wallet:
              </p>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  wordBreak: "break-all",
                }}
              >
                {address}
              </p>
            </div>

            {/* Balance */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #1e293b",
                padding: "18px",
              }}
            >
              <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                Your Virdato Balance
              </p>

              {balanceLoading ? (
                <p style={{ color: "#64748b" }}>Loading...</p>
              ) : (
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.7rem",
                    fontWeight: 700,
                  }}
                >
                  {prettyBalance} {symbol ?? "VDT"}
                </p>
              )}
            </div>

            {/* SEND TOKENS */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #1e293b",
                padding: "18px",
              }}
            >
              <p style={{ color: "#94a3b8", marginBottom: "10px" }}>
                Send Virdato Tokens
              </p>

              {/* Recipient Address */}
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    marginBottom: "4px",
                    display: "block",
                  }}
                >
                  Recipient Address
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #1e293b",
                    fontFamily: "monospace",
                    backgroundColor: "#020617",
                    color: "white",
                  }}
                  placeholder="0x..."
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    marginBottom: "4px",
                    display: "block",
                  }}
                >
                  Amount
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #1e293b",
                    backgroundColor: "#020617",
                    color: "white",
                  }}
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={
                  txPending ||
                  !address ||
                  !decimals ||
                  !to ||
                  !amount ||
                  !injected
                }
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: "#22c55e",
                  color: "#020617",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity:
                    txPending ||
                    !address ||
                    !decimals ||
                    !to ||
                    !amount ||
                    !injected
                      ? 0.5
                      : 1,
                  border: "none",
                }}
              >
                {txPending ? "Sending…" : "Send Tokens"}
              </button>

              {txHash && (
                <p
                  style={{
                    marginTop: "10px",
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    wordBreak: "break-all",
                  }}
                >
                  Tx sent: {txHash}
                </p>
              )}

              {txError && (
                <p style={{ marginTop: "10px", color: "#f97373" }}>
                  {txError.message}
                </p>
              )}

              {error && !isConnected && (
                <p style={{ marginTop: "10px", color: "#f97373" }}>
                  {error.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
