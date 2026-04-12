"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import {
  MERKLE_REWARDS_V3_ABI,
  MERKLE_REWARDS_V3_ADDRESS,
} from "../../lib/contracts/merkleRewardsV3";

type RewardResponse = {
  channelId?: string;
  wallet?: string;
  youtube?: {
    views?: number;
    likes?: number;
    impressions?: number;
    score?: number;
  };
  x?: {
    connected?: boolean;
    username?: string | null;
    displayName?: string | null;
    followers?: number;
    following?: number;
    tweets?: number;
    listed?: number;
    likes?: number;
    mediaCount?: number;
    score?: number;
  };
  socialBreakdown?: {
    youtubeScore?: number;
    xScore?: number;
    combinedScore?: number;
  };
  engagementTotal?: number;
  normalizedTierProgress?: number;
  estimatedVird?: number;
  grossReward?: number;
  baseReward?: number;
  variableReward?: number;
  periodCap?: number;
  remainingPeriodPoolBefore?: number;
  remainingPeriodPoolAfter?: number;
  tier?: string;
  message?: string;
  error?: string;
};

type ClaimPayloadResponse = {
  claimReady?: boolean;
  reason?: string;
  epoch?: number;
  amountWei?: string;
  amount?: string;
  proof?: `0x${string}`[];
  root?: `0x${string}` | string;
  claimTxHash?: string | null;
  claimedAt?: string | null;
  error?: string;
};

type ClaimPreflightResponse = {
  ok?: boolean;
  reason?: string;
  epoch?: number;
  amountWei?: string;
  proof?: `0x${string}`[];
  merkleRoot?: `0x${string}` | string | null;
  claimContractBalance?: string;
  error?: string;
};

type TransparencyResponse = {
  latestEpoch?: number | null;
  status?: string | null;
  merkleRoot?: string | null;
  totalGrossWei?: string;
  totalCappedWei?: string;
  totalFundedWei?: string;
  totalClaimedWei?: string;
  fundingTxHash?: string | null;
  finalizeTxHash?: string | null;
  claimContractBalance?: string;
};

type SocialPlatform =
  | "youtube"
  | "x"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "linkedin";

type SocialAccountSummary = {
  platform: SocialPlatform;
  connected: boolean;
  id?: string | null;
  userId?: string | null;
  platformAccountId?: string | null;
  username?: string | null;
  displayName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

type SocialAccountsResponse = {
  ok?: boolean;
  accounts?: SocialAccountSummary[];
  error?: string;
};

type XMetrics = {
  platform?: string;
  accountId?: string;
  username?: string;
  displayName?: string | null;
  followers?: number;
  following?: number;
  tweets?: number;
  listed?: number;
  likes?: number;
  mediaCount?: number;
};

type XMetricsResponse = {
  ok?: boolean;
  connected?: boolean;
  metrics?: XMetrics | null;
  error?: string;
};

type YouTubeConnectedMetrics = {
  channelId?: string;
  title?: string | null;
  customUrl?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  viewCount?: number;
  subscriberCount?: number;
  videoCount?: number;
};

type YouTubeMetricsResponse = {
  ok?: boolean;
  connected?: boolean;
  metrics?: YouTubeConnectedMetrics | null;
  error?: string;
};

const BASESCAN_URL =
  process.env.NEXT_PUBLIC_BASESCAN_URL || "https://basescan.org";

const PLATFORM_ORDER: SocialPlatform[] = [
  "youtube",
  "x",
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
];

function formatNumber(value?: number | string | bigint | null) {
  if (value === undefined || value === null || value === "") return "—";

  try {
    const num =
      typeof value === "bigint"
        ? Number(value)
        : typeof value === "string"
          ? Number(value)
          : value;

    if (Number.isNaN(num)) return String(value);

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return String(value);
  }
}

function formatWeiToTokenString(value?: string | null, decimals = 18) {
  if (!value) return "—";

  try {
    const raw = BigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const whole = raw / divisor;
    const fraction = raw % divisor;

    if (fraction === 0n) {
      return whole.toString();
    }

    const padded = fraction.toString().padStart(decimals, "0");
    const trimmed = padded.replace(/0+$/, "").slice(0, 4);

    return trimmed ? `${whole.toString()}.${trimmed}` : whole.toString();
  } catch {
    return value;
  }
}

function shortHash(hash?: string | null) {
  if (!hash) return "—";
  if (hash.length < 14) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function humanizeClaimReason(reason?: string) {
  switch (reason) {
    case "NO_ACTIVE_EPOCH":
      return "No active claim epoch is open right now.";
    case "WALLET_NOT_ELIGIBLE":
      return "This wallet is not eligible for the current open epoch.";
    case "ALREADY_CLAIMED":
      return "This wallet already claimed for the current epoch.";
    case "INVALID_PROOF":
      return "Claim proof is missing or invalid.";
    case "INVALID_AMOUNT":
      return "Claim amount is missing or invalid.";
    default:
      return reason || "";
  }
}

function platformLabel(platform: SocialPlatform) {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "x":
      return "X";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "facebook":
      return "Facebook";
    case "linkedin":
      return "LinkedIn";
    default:
      return platform;
  }
}

function platformDescription(platform: SocialPlatform) {
  switch (platform) {
    case "youtube":
      return "Connected channel status and identity.";
    case "x":
      return "Connected account status and live metrics.";
    case "instagram":
      return "Professional Instagram account status and identity.";
    case "tiktok":
      return "Account status scaffolded. Connect flow comes next.";
    case "facebook":
      return "Account status scaffolded. Connect flow comes next.";
    case "linkedin":
      return "Account status scaffolded. Connect flow comes next.";
    default:
      return "";
  }
}

function platformAccent(platform: SocialPlatform) {
  switch (platform) {
    case "youtube":
      return "#dc2626";
    case "x":
      return "#111827";
    case "instagram":
      return "#c026d3";
    case "tiktok":
      return "#0f172a";
    case "facebook":
      return "#2563eb";
    case "linkedin":
      return "#0a66c2";
    default:
      return "#111827";
  }
}

function platformConnectHref(platform: SocialPlatform) {
  switch (platform) {
    case "x":
      return "/api/auth/x/connect";
    case "youtube":
      return "/api/auth/google/connect";
    case "instagram":
      return "/api/oauth/instagram/start";
    default:
      return "";
  }
}

function platformSupportsLiveConnect(platform: SocialPlatform) {
  return (
    platform === "x" ||
    platform === "youtube" ||
    platform === "instagram"
  );
}

function platformButtonLabel(platform: SocialPlatform, connected: boolean) {
  switch (platform) {
    case "x":
      return connected ? "Reconnect X" : "Connect X";
    case "youtube":
      return connected ? "Reconnect YouTube" : "Connect YouTube";
    case "instagram":
      return connected ? "Reconnect Instagram" : "Connect Instagram";
    default:
      return "Connect";
  }
}

function TxLink({
  hash,
  label,
}: {
  hash?: string | null;
  label?: string;
}) {
  if (!hash) return <span>—</span>;

  return (
    <a
      href={`${BASESCAN_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: "#0a66c2", wordBreak: "break-all" }}
    >
      {label || shortHash(hash)}
    </a>
  );
}

function AddressLink({
  address,
  label,
}: {
  address: string;
  label?: string;
}) {
  return (
    <a
      href={`${BASESCAN_URL}/address/${address}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: "#0a66c2", wordBreak: "break-all" }}
    >
      {label || shortHash(address)}
    </a>
  );
}

function StatusCard({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const styles = {
    neutral: {
      background: "#f7f8fa",
      border: "1px solid #e3e6eb",
      color: "#111827",
    },
    good: {
      background: "#ecfdf3",
      border: "1px solid #b7ebc6",
      color: "#106c43",
    },
    warn: {
      background: "#fff8e6",
      border: "1px solid #f1d58a",
      color: "#7c5a00",
    },
    bad: {
      background: "#fff1f1",
      border: "1px solid #efb1b1",
      color: "#a61b1b",
    },
  } as const;

  return (
    <div
      style={{
        ...styles[tone],
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function SocialConnectCard({
  account,
}: {
  account: SocialAccountSummary;
}) {
  const accent = platformAccent(account.platform);
  const href = platformConnectHref(account.platform);
  const liveConnect = platformSupportsLiveConnect(account.platform);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: accent,
            }}
          >
            {platformLabel(account.platform)}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#4b5563",
              lineHeight: 1.5,
            }}
          >
            {platformDescription(account.platform)}
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            borderRadius: 999,
            padding: "6px 10px",
            background: account.connected ? "#ecfdf3" : "#f7f8fa",
            border: account.connected
              ? "1px solid #b7ebc6"
              : "1px solid #e5e7eb",
            color: account.connected ? "#106c43" : "#6b7280",
            whiteSpace: "nowrap",
          }}
        >
          {account.connected ? "Connected" : "Not Connected"}
        </div>
      </div>

      <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.6 }}>
        <div>
          <strong>Display Name:</strong> {account.displayName || "—"}
        </div>
        <div>
          <strong>Username:</strong> {account.username || "—"}
        </div>
        <div>
          <strong>Platform ID:</strong> {account.platformAccountId || "—"}
        </div>
      </div>

      {liveConnect ? (
        <a
          href={href}
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            height: 44,
            borderRadius: 12,
            background: accent,
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {platformButtonLabel(account.platform, account.connected)}
        </a>
      ) : (
        <button
          disabled
          style={{
            height: 44,
            borderRadius: 12,
            border: "none",
            background: "#d1d5db",
            color: "#374151",
            fontWeight: 800,
            fontSize: 14,
            cursor: "not-allowed",
          }}
        >
          Connect Flow Coming Soon
        </button>
      )}
    </div>
  );
}

export default function RewardsPage() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [result, setResult] = useState<RewardResponse | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [claimEpoch, setClaimEpoch] = useState<number | null>(null);
  const [claimAmountWei, setClaimAmountWei] = useState<string>("");
  const [claimProof, setClaimProof] = useState<`0x${string}`[]>([]);
  const [payloadStatus, setPayloadStatus] = useState("");
  const [claimRoot, setClaimRoot] = useState<string>("");
  const [claimReason, setClaimReason] = useState("");
  const [claimReady, setClaimReady] = useState(false);
  const [claimTxHashFromApi, setClaimTxHashFromApi] = useState<string>("");

  const [preflightStatus, setPreflightStatus] = useState("");
  const [claimContractBalanceWei, setClaimContractBalanceWei] = useState("");
  const [transparency, setTransparency] = useState<TransparencyResponse | null>(
    null
  );

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountSummary[]>(
    []
  );
  const [socialLoading, setSocialLoading] = useState(false);
  const [xMetrics, setXMetrics] = useState<XMetrics | null>(null);
  const [xMetricsLoading, setXMetricsLoading] = useState(false);
  const [youtubeMetrics, setYouTubeMetrics] =
    useState<YouTubeConnectedMetrics | null>(null);
  const [youtubeMetricsLoading, setYouTubeMetricsLoading] = useState(false);

  const { data: alreadyClaimed, refetch: refetchClaimed } = useReadContract({
    address: MERKLE_REWARDS_V3_ADDRESS,
    abi: MERKLE_REWARDS_V3_ABI,
    functionName: "claimed",
    args:
      claimEpoch !== null && address
        ? [BigInt(claimEpoch), address as `0x${string}`]
        : undefined,
    query: {
      enabled: Boolean(address && claimEpoch !== null),
    },
  });

  const xAccount = socialAccounts.find((item) => item.platform === "x");
  const youtubeAccount = socialAccounts.find(
    (item) => item.platform === "youtube"
  );
  const instagramAccount = socialAccounts.find(
    (item) => item.platform === "instagram"
  );

  const normalizeClaimPayload = (payload: ClaimPayloadResponse) => {
    const normalizedAmountWei = payload.amountWei || payload.amount || "";
    const normalizedProof = Array.isArray(payload.proof) ? payload.proof : [];
    const normalizedEpoch =
      payload.epoch !== undefined && payload.epoch !== null
        ? payload.epoch
        : null;

    const normalizedReason = payload.reason || "";
    const normalizedReady = payload.claimReady === true;

    return {
      isReady:
        normalizedReady &&
        normalizedEpoch !== null &&
        normalizedAmountWei !== "" &&
        normalizedProof.length > 0,
      claimReady: normalizedReady,
      epoch: normalizedEpoch,
      amountWei: normalizedAmountWei,
      proof: normalizedProof,
      root: payload.root ? String(payload.root) : "",
      reason: normalizedReason,
      error: payload.error || "",
      claimTxHash: payload.claimTxHash || "",
      claimedAt: payload.claimedAt || "",
    };
  };

  const fetchTransparency = async () => {
    const res = await fetch("/api/transparency", { cache: "no-store" });
    const data: TransparencyResponse = await res.json();

    if (!res.ok) {
      throw new Error("Failed to load transparency data.");
    }

    setTransparency(data);
    return data;
  };

  const fetchSocialAccounts = async () => {
    setSocialLoading(true);

    try {
      const res = await fetch("/api/social-accounts", { cache: "no-store" });
      const data: SocialAccountsResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load social accounts.");
      }

      const accounts = PLATFORM_ORDER.map((platform) => {
        return (
          data.accounts?.find((item) => item.platform === platform) || {
            platform,
            connected: false,
          }
        );
      });

      setSocialAccounts(accounts as SocialAccountSummary[]);
      return accounts as SocialAccountSummary[];
    } catch (err: any) {
      setError(
        (prev) =>
          prev || err?.message || "Failed to load social account status."
      );
      return [];
    } finally {
      setSocialLoading(false);
    }
  };

  const fetchXMetrics = async () => {
    setXMetricsLoading(true);

    try {
      const res = await fetch("/api/social-metrics/x", { cache: "no-store" });
      const data: XMetricsResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load X metrics.");
      }

      setXMetrics(data.metrics || null);
      return data.metrics || null;
    } catch (err: any) {
      setError((prev) => prev || err?.message || "Failed to load X metrics.");
      return null;
    } finally {
      setXMetricsLoading(false);
    }
  };

  const fetchYouTubeMetrics = async () => {
    setYouTubeMetricsLoading(true);

    try {
      const res = await fetch("/api/social-metrics/youtube", {
        cache: "no-store",
      });
      const data: YouTubeMetricsResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load YouTube metrics.");
      }

      setYouTubeMetrics(data.metrics || null);
      return data.metrics || null;
    } catch (err: any) {
      setError(
        (prev) => prev || err?.message || "Failed to load YouTube metrics."
      );
      return null;
    } finally {
      setYouTubeMetricsLoading(false);
    }
  };

  const refreshSocialData = async () => {
    await fetchSocialAccounts();
    await fetchXMetrics();
    await fetchYouTubeMetrics();
  };

  const fetchClaimPayload = async (walletAddress: string) => {
    const payloadRes = await fetch(
      `/api/claim-payload?wallet=${encodeURIComponent(walletAddress)}`,
      { cache: "no-store" }
    );

    const payload: ClaimPayloadResponse = await payloadRes.json();
    const normalized = normalizeClaimPayload(payload);

    if (!payloadRes.ok) {
      throw new Error(
        normalized.error ||
          humanizeClaimReason(normalized.reason) ||
          "Failed to fetch claim payload."
      );
    }

    return normalized;
  };

  const preflightClaim = async (walletAddress: string) => {
    const res = await fetch(
      `/api/claim-preflight?wallet=${encodeURIComponent(walletAddress)}`,
      { cache: "no-store" }
    );

    const data: ClaimPreflightResponse = await res.json();

    if (!res.ok) {
      throw new Error(data?.reason || data?.error || "Claim preflight failed.");
    }

    return data;
  };

  const syncClaimUiFromPayload = async (walletAddress: string) => {
    const payload = await fetchClaimPayload(walletAddress);

    setClaimEpoch(payload.epoch);
    setClaimAmountWei(payload.amountWei);
    setClaimProof(payload.proof);
    setClaimRoot(payload.root || "");
    setClaimReason(payload.reason || "");
    setClaimReady(payload.claimReady);
    setClaimTxHashFromApi(payload.claimTxHash || "");

    if (payload.isReady) {
      setPayloadStatus("Claim payload is ready.");
    } else if (payload.reason) {
      setPayloadStatus(humanizeClaimReason(payload.reason));
    } else if (payload.error) {
      setPayloadStatus(payload.error);
    } else {
      setPayloadStatus("Claim payload is incomplete.");
    }

    return payload;
  };

  const runPreflight = async (walletAddress: string) => {
    const preflight = await preflightClaim(walletAddress);

    if (preflight.epoch !== undefined && preflight.epoch !== null) {
      setClaimEpoch(preflight.epoch);
    }

    if (preflight.amountWei) {
      setClaimAmountWei(preflight.amountWei);
    }

    if (Array.isArray(preflight.proof)) {
      setClaimProof(preflight.proof);
    }

    if (preflight.merkleRoot) {
      setClaimRoot(String(preflight.merkleRoot));
    }

    if (preflight.claimContractBalance) {
      setClaimContractBalanceWei(preflight.claimContractBalance);
    }

    if (preflight.ok) {
      setPreflightStatus("Claim preflight passed.");
    } else {
      setPreflightStatus(preflight.reason || "Claim preflight failed.");
    }

    return preflight;
  };

  const resetClaimState = () => {
    setClaimEpoch(null);
    setClaimAmountWei("");
    setClaimProof([]);
    setClaimRoot("");
    setClaimReason("");
    setClaimReady(false);
    setClaimTxHashFromApi("");
    setPayloadStatus("");
    setPreflightStatus("");
    setClaimContractBalanceWei("");
  };

  useEffect(() => {
    refreshSocialData();
  }, []);

  const checkRewards = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      setResult(null);
      setTxHash("");
      resetClaimState();

      if (!channelId.trim()) {
        setError("Please enter a YouTube Channel ID.");
        return;
      }

      const wallet = address || "TEMP_WALLET";

      const rewardsRes = await fetch(
        `/api/rewards?channelId=${encodeURIComponent(
          channelId
        )}&wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" }
      );

      const rewardsData: RewardResponse = await rewardsRes.json();

      if (!rewardsRes.ok) {
        throw new Error(rewardsData?.error || "Failed to fetch rewards.");
      }

      setResult(rewardsData);
      await fetchTransparency();

      if (address) {
        const payload = await syncClaimUiFromPayload(address);

        if (payload.isReady) {
          await runPreflight(address);
          await refetchClaimed();
        }
      } else {
        setPayloadStatus("Connect wallet to prepare claim payload.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setError("");
      setSuccessMessage("");
      setTxHash("");

      if (!isConnected || !address) {
        setError("Connect your wallet first.");
        return;
      }

      if (!channelId.trim()) {
        setError("Missing channel ID.");
        return;
      }

      if (chainId !== base.id) {
        await switchChainAsync({ chainId: base.id });
      }

      const payload = await syncClaimUiFromPayload(address);

      if (!payload.isReady) {
        throw new Error(
          humanizeClaimReason(payload.reason) ||
            payload.error ||
            "Claim payload is incomplete."
        );
      }

      const preflight = await runPreflight(address);

      if (!preflight.ok) {
        throw new Error(preflight.reason || "Claim preflight failed.");
      }

      if (payload.epoch === null) {
        throw new Error("Missing epoch in claim payload.");
      }

      if (!payload.amountWei) {
        throw new Error("Missing claim amount.");
      }

      if (!payload.proof.length) {
        throw new Error("Missing proof in claim payload.");
      }

      const claimedCheck = await refetchClaimed();
      if (claimedCheck.data === true) {
        throw new Error(
          `This wallet has already claimed for epoch ${payload.epoch}.`
        );
      }

      const hash = await writeContractAsync({
        address: MERKLE_REWARDS_V3_ADDRESS,
        abi: MERKLE_REWARDS_V3_ABI,
        functionName: "claim",
        args: [BigInt(payload.epoch), BigInt(payload.amountWei), payload.proof],
      });

      if (!hash) {
        throw new Error("No transaction hash returned from wallet.");
      }

      setTxHash(hash);
      setPayloadStatus("Transaction submitted. Waiting for confirmation...");

      if (!publicClient) {
        throw new Error("Public client unavailable.");
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (!receipt) {
        throw new Error("No transaction receipt returned.");
      }

      if (receipt.status !== "success") {
        setTxHash("");
        throw new Error("Transaction failed onchain.");
      }

      const confirmRes = await fetch("/api/claim-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: address,
          epoch: payload.epoch,
          txHash: hash,
          claimedAt: new Date().toISOString(),
        }),
      });

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json().catch(() => null);
        throw new Error(
          confirmData?.error ||
            "Claim succeeded onchain, but failed to persist claim confirmation."
        );
      }

      await refetchClaimed();
      await fetchTransparency();
      await syncClaimUiFromPayload(address);
      await refreshSocialData();

      setSuccessMessage("Claim confirmed successfully.");
      setPayloadStatus("Claim completed successfully.");
    } catch (err: any) {
      setTxHash("");

      const message =
        err?.shortMessage || err?.message || "Claim failed unexpectedly.";

      if (
        message.toLowerCase().includes("user rejected") ||
        message.toLowerCase().includes("user denied") ||
        message.toLowerCase().includes("rejected the request") ||
        err?.code === 4001
      ) {
        setError("MetaMask transaction was cancelled.");
      } else {
        setError(message);
      }
    } finally {
      setClaiming(false);
    }
  };

  const preflightOk =
    preflightStatus.toLowerCase().includes("passed") ||
    preflightStatus.toLowerCase().includes("ok");

  const canClaim =
    isConnected &&
    chainId === base.id &&
    claimReady &&
    claimEpoch !== null &&
    claimAmountWei !== "" &&
    claimProof.length > 0 &&
    alreadyClaimed !== true &&
    preflightOk &&
    !claiming;

  const remainingPoolAfterClaim = useMemo(() => {
    if (!claimContractBalanceWei || !claimAmountWei) return "—";

    try {
      const before = BigInt(claimContractBalanceWei);
      const amount = BigInt(claimAmountWei);

      if (before < amount) return "Insufficient";

      return formatWeiToTokenString((before - amount).toString());
    } catch {
      return "—";
    }
  }, [claimContractBalanceWei, claimAmountWei]);

  const payloadTone =
    claimReady && claimEpoch !== null && claimAmountWei && claimProof.length > 0
      ? "good"
      : claimReason === "ALREADY_CLAIMED"
        ? "warn"
        : claimReason
          ? "bad"
          : "warn";

  const alreadyClaimedUi =
    alreadyClaimed === true || claimReason === "ALREADY_CLAIMED";

  const claimButtonLabel = !isConnected
    ? "Connect Wallet"
    : chainId !== base.id
      ? "Switch to Base"
      : alreadyClaimedUi
        ? "Already Claimed"
        : claiming
          ? "Claiming..."
          : !claimReady
            ? "Not Claimable"
            : !preflightOk
              ? "Fix Preflight First"
              : "Claim VIRD";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 18px 60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            background: "#0a0a0a",
            color: "#fff",
            borderRadius: 18,
            padding: "22px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>
              VIRD Rewards
            </h1>
            <div
              style={{
                marginTop: 8,
                color: "#d1d5db",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Check rewards, verify preflight, claim VIRD on Base, and manage
              connected social accounts.
            </div>
          </div>

          <ConnectButton />
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <label
                htmlFor="channelId"
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                YouTube Channel ID
              </label>
              <input
                id="channelId"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Enter your YouTube Channel ID"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #d0d7e2",
                  padding: "0 14px",
                  fontSize: 16,
                  outline: "none",
                }}
              />
            </div>

            <button
              onClick={checkRewards}
              disabled={loading}
              style={{
                height: 48,
                borderRadius: 12,
                border: "none",
                background: loading ? "#94a3b8" : "#111827",
                color: "#fff",
                padding: "0 18px",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Checking..." : "Check Rewards"}
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 14,
              color: "#4b5563",
              lineHeight: 1.6,
            }}
          >
            Connected wallet:{" "}
            {address ? <AddressLink address={address} label={address} /> : "—"}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 28 }}>
                Connected Social Accounts
              </h2>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: "#4b5563",
                  lineHeight: 1.6,
                }}
              >
                X, YouTube, and Instagram can use live connect flows. The other
                platforms remain scaffolded here and can use the same
                ConnectedAccount table as their OAuth flows are added.
              </div>
            </div>

            <button
              onClick={refreshSocialData}
              disabled={
                socialLoading || xMetricsLoading || youtubeMetricsLoading
              }
              style={{
                height: 42,
                borderRadius: 12,
                border: "1px solid #d0d7e2",
                background: "#fff",
                color: "#111827",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  socialLoading || xMetricsLoading || youtubeMetricsLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {socialLoading || xMetricsLoading || youtubeMetricsLoading
                ? "Refreshing..."
                : "Refresh Social Data"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 14,
            }}
          >
            {socialAccounts.map((account) => (
              <SocialConnectCard key={account.platform} account={account} />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 28 }}>
              YouTube Metrics
            </h2>

            {!youtubeAccount?.connected ? (
              <div
                style={{
                  fontSize: 15,
                  color: "#4b5563",
                  lineHeight: 1.7,
                }}
              >
                No YouTube account is connected yet. Use the YouTube card above
                to connect it.
              </div>
            ) : youtubeMetricsLoading ? (
              <div
                style={{
                  fontSize: 15,
                  color: "#4b5563",
                }}
              >
                Loading YouTube metrics...
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
                <div>
                  <strong>Channel Title:</strong>{" "}
                  {youtubeMetrics?.title || youtubeAccount.displayName || "—"}
                </div>
                <div>
                  <strong>Custom URL / Channel ID:</strong>{" "}
                  {youtubeMetrics?.customUrl ||
                    youtubeAccount.username ||
                    youtubeMetrics?.channelId ||
                    "—"}
                </div>
                <div>
                  <strong>Views:</strong>{" "}
                  {formatNumber(youtubeMetrics?.viewCount)}
                </div>
                <div>
                  <strong>Subscribers:</strong>{" "}
                  {formatNumber(youtubeMetrics?.subscriberCount)}
                </div>
                <div>
                  <strong>Videos:</strong>{" "}
                  {formatNumber(youtubeMetrics?.videoCount)}
                </div>
                <div>
                  <strong>Current YouTube Score:</strong>{" "}
                  {formatNumber(result?.youtube?.score ?? 0)}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 28 }}>
              X Metrics
            </h2>

            {!xAccount?.connected ? (
              <div
                style={{
                  fontSize: 15,
                  color: "#4b5563",
                  lineHeight: 1.7,
                }}
              >
                No X account is connected yet. Use the X card above to connect
                it.
              </div>
            ) : xMetricsLoading ? (
              <div
                style={{
                  fontSize: 15,
                  color: "#4b5563",
                }}
              >
                Loading X metrics...
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
                <div>
                  <strong>Display Name:</strong>{" "}
                  {xMetrics?.displayName || xAccount.displayName || "—"}
                </div>
                <div>
                  <strong>Username:</strong>{" "}
                  {xMetrics?.username || xAccount.username || "—"}
                </div>
                <div>
                  <strong>Followers:</strong>{" "}
                  {formatNumber(xMetrics?.followers)}
                </div>
                <div>
                  <strong>Following:</strong>{" "}
                  {formatNumber(xMetrics?.following)}
                </div>
                <div>
                  <strong>Posts:</strong> {formatNumber(xMetrics?.tweets)}
                </div>
                <div>
                  <strong>Listed:</strong> {formatNumber(xMetrics?.listed)}
                </div>
                <div>
                  <strong>Likes:</strong> {formatNumber(xMetrics?.likes)}
                </div>
                <div>
                  <strong>Media Count:</strong>{" "}
                  {formatNumber(xMetrics?.mediaCount)}
                </div>
                <div>
                  <strong>Current X Score:</strong>{" "}
                  {formatNumber(result?.x?.score ?? 0)}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 28 }}>
              Social Connection Status
            </h2>

            <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
              <div>
                <strong>YouTube Account:</strong>{" "}
                {youtubeAccount?.connected ? "Connected" : "Not connected"}
              </div>
              <div>
                <strong>X Account:</strong>{" "}
                {xAccount?.connected ? "Connected" : "Not connected"}
              </div>
              <div>
                <strong>Instagram:</strong>{" "}
                {instagramAccount?.connected ? "Connected" : "Not connected"}
              </div>
              <div>
                <strong>TikTok:</strong>{" "}
                {socialAccounts.find((a) => a.platform === "tiktok")?.connected
                  ? "Connected"
                  : "Not connected"}
              </div>
              <div>
                <strong>Facebook:</strong>{" "}
                {socialAccounts.find((a) => a.platform === "facebook")
                  ?.connected
                  ? "Connected"
                  : "Not connected"}
              </div>
              <div>
                <strong>LinkedIn:</strong>{" "}
                {socialAccounts.find((a) => a.platform === "linkedin")
                  ?.connected
                  ? "Connected"
                  : "Not connected"}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: "#fff1f1",
              border: "1px solid #efb1b1",
              color: "#a61b1b",
              borderRadius: 14,
              padding: 16,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div
            style={{
              background: "#ecfdf3",
              border: "1px solid #b7ebc6",
              color: "#106c43",
              borderRadius: 14,
              padding: 16,
              fontWeight: 700,
            }}
          >
            {successMessage}
          </div>
        ) : null}

        {txHash ? (
          <div
            style={{
              background: "#ecfdf3",
              border: "1px solid #b7ebc6",
              color: "#106c43",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <strong>Transaction submitted:</strong> <TxLink hash={txHash} />
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <StatusCard
            title="Wallet / Network"
            tone={
              !isConnected
                ? "warn"
                : chainId === base.id
                  ? "good"
                  : "warn"
            }
            value={
              !isConnected
                ? "Connect wallet to prepare and claim rewards."
                : chainId === base.id
                  ? "Connected to Base Mainnet."
                  : "Wallet connected, but switch to Base Mainnet."
            }
          />

          <StatusCard
            title="Claim Payload"
            tone={payloadTone}
            value={payloadStatus || "No claim payload loaded yet."}
          />

          <StatusCard
            title="Preflight"
            tone={
              preflightStatus
                ? preflightOk
                  ? "good"
                  : "warn"
                : "neutral"
            }
            value={preflightStatus || "Preflight has not run yet."}
          />

          <StatusCard
            title="Already Claimed"
            tone={alreadyClaimedUi ? "warn" : "neutral"}
            value={alreadyClaimedUi ? "Yes" : "No"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #d7e3f4",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 28 }}>
              Claim Panel
            </h2>

            <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
              <div>
                <strong>Claim Epoch:</strong>{" "}
                {claimEpoch !== null ? claimEpoch : "—"}
              </div>
              <div>
                <strong>Claim Status:</strong>{" "}
                {claimReady ? "Ready" : humanizeClaimReason(claimReason) || "—"}
              </div>
              <div>
                <strong>Claim Amount (Wei):</strong>{" "}
                {claimAmountWei || "—"}
              </div>
              <div>
                <strong>Claim Amount (VIRD):</strong>{" "}
                {formatWeiToTokenString(claimAmountWei)}
              </div>
              <div>
                <strong>Proof Items:</strong> {claimProof.length}
              </div>
              <div>
                <strong>Merkle Root:</strong>{" "}
                {claimRoot ? (
                  <span style={{ wordBreak: "break-all" }}>{claimRoot}</span>
                ) : (
                  "—"
                )}
              </div>
              <div>
                <strong>Last Claim TX:</strong>{" "}
                <TxLink hash={claimTxHashFromApi || null} />
              </div>
              <div>
                <strong>Claim Contract:</strong>{" "}
                <AddressLink address={MERKLE_REWARDS_V3_ADDRESS} />
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <button
                onClick={handleClaim}
                disabled={!canClaim}
                style={{
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: canClaim ? "#19c37d" : "#9ca3af",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: canClaim ? "pointer" : "not-allowed",
                }}
              >
                {claimButtonLabel}
              </button>

              <div
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                  lineHeight: 1.6,
                }}
              >
                Wallet popup only opens after payload validation and preflight
                both pass.
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #d7e3f4",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 28 }}>
              Funding / Transparency
            </h2>

            <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
              <div>
                <strong>Latest Epoch:</strong>{" "}
                {transparency?.latestEpoch ?? "—"}
              </div>
              <div>
                <strong>Latest Status:</strong>{" "}
                {transparency?.status || "—"}
              </div>
              <div>
                <strong>Claim Contract Balance (Wei):</strong>{" "}
                {claimContractBalanceWei ||
                  transparency?.claimContractBalance ||
                  "—"}
              </div>
              <div>
                <strong>Claim Contract Balance (VIRD):</strong>{" "}
                {formatWeiToTokenString(
                  claimContractBalanceWei || transparency?.claimContractBalance
                )}
              </div>
              <div>
                <strong>Remaining After This Claim:</strong>{" "}
                {remainingPoolAfterClaim}
              </div>
              <div>
                <strong>Total Funded (VIRD):</strong>{" "}
                {formatWeiToTokenString(transparency?.totalFundedWei)}
              </div>
              <div>
                <strong>Total Claimed (VIRD):</strong>{" "}
                {formatWeiToTokenString(transparency?.totalClaimedWei)}
              </div>
              <div>
                <strong>Funding TX:</strong>{" "}
                <TxLink hash={transparency?.fundingTxHash} />
              </div>
              <div>
                <strong>Finalize TX:</strong>{" "}
                <TxLink hash={transparency?.finalizeTxHash} />
              </div>
              <div>
                <strong>Latest Root:</strong>{" "}
                {transparency?.merkleRoot ? (
                  <span style={{ wordBreak: "break-all" }}>
                    {transparency.merkleRoot}
                  </span>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </div>

        {result ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 28 }}>
              Reward Summary
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <StatusCard
                title="Tier"
                value={result.tier || "—"}
                tone="neutral"
              />
              <StatusCard
                title="YouTube Views"
                value={formatNumber(result.youtube?.views)}
                tone="neutral"
              />
              <StatusCard
                title="YouTube Score"
                value={
                  result.youtube?.score !== undefined
                    ? formatNumber(result.youtube.score)
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="X Score"
                value={
                  result.x?.score !== undefined
                    ? formatNumber(result.x.score)
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="X Followers"
                value={formatNumber(result.x?.followers)}
                tone="neutral"
              />
              <StatusCard
                title="X Posts"
                value={formatNumber(result.x?.tweets)}
                tone="neutral"
              />
              <StatusCard
                title="Combined Social Score"
                value={formatNumber(result.socialBreakdown?.combinedScore)}
                tone="good"
              />
              <StatusCard
                title="Engagement Total"
                value={formatNumber(result.engagementTotal)}
                tone="neutral"
              />
              <StatusCard
                title="Tier Progress"
                value={
                  result.normalizedTierProgress !== undefined
                    ? `${formatNumber(result.normalizedTierProgress)}%`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Base Reward"
                value={
                  result.baseReward !== undefined
                    ? `${formatNumber(result.baseReward)} VIRD`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Variable Reward"
                value={
                  result.variableReward !== undefined
                    ? `${formatNumber(result.variableReward)} VIRD`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Gross Reward"
                value={
                  result.grossReward !== undefined
                    ? `${formatNumber(result.grossReward)} VIRD`
                    : "—"
                }
                tone="good"
              />
              <StatusCard
                title="Estimated After Cap"
                value={
                  result.estimatedVird !== undefined
                    ? `${formatNumber(result.estimatedVird)} VIRD`
                    : "—"
                }
                tone="good"
              />
              <StatusCard
                title="Pool Before Claim"
                value={
                  result.remainingPeriodPoolBefore !== undefined
                    ? `${formatNumber(result.remainingPeriodPoolBefore)} VIRD`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Pool After Claim"
                value={
                  result.remainingPeriodPoolAfter !== undefined
                    ? `${formatNumber(result.remainingPeriodPoolAfter)} VIRD`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Period Cap"
                value={
                  result.periodCap !== undefined
                    ? `${formatNumber(result.periodCap)} VIRD`
                    : "—"
                }
                tone="neutral"
              />
              <StatusCard
                title="Backend Message"
                value={result.message || "—"}
                tone="neutral"
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}