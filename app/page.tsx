import {
  VIRD_CHAIN_NAME,
  VIRD_NATIVE_SYMBOL,
  VIRD_TOKEN_ADDRESS,
  VIRD_TOKEN_NAME,
  VIRD_TOKEN_SYMBOL,
} from "./lib/virdToken";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>Virdato Dashboard</h1>
      <p>{VIRD_CHAIN_NAME} · {VIRD_TOKEN_NAME} on {VIRD_CHAIN_NAME}.</p>

      <section style={{ marginTop: 24 }}>
        <h2>VIRD Token</h2>
        <p><strong>Token:</strong> {VIRD_TOKEN_SYMBOL}</p>
        <p><strong>Contract:</strong> {VIRD_TOKEN_ADDRESS}</p>
        <p><strong>Native Gas Token:</strong> {VIRD_NATIVE_SYMBOL}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Rewards</h2>
        <p>
          Go to <a href="/rewards">/rewards</a> to check creator tiers and estimated VIRD rewards.
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>API Links</h2>
        <ul>
          <li><a href="/api/youtube?channelId=UC_x5XG1OV2P6uZZ5FSM9Ttw">Test YouTube API</a></li>
          <li><a href="/api/rewards?channelId=UC_x5XG1OV2P6uZZ5FSM9Ttw">Test Rewards API</a></li>
          <li><a href="/api/analytics/transfers">Test Base Analytics API</a></li>
        </ul>
      </section>
    </main>
  );
}