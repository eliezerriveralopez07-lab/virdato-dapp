export type RewardSnapshotEntry = {
  address: string;
  amount: string;
};

const RAW_SNAPSHOT: RewardSnapshotEntry[] = [
  {
    address: "0x59ff2fDaA71606e4eb63050454ab9D8A418fCAf6",
    amount: "2130000000000000000000",
  },
  {
    address: "0x000000000000000000000000000000000000dEaD",
    amount: "1000000000000000000",
  },
];

export function buildRewardSnapshot(): RewardSnapshotEntry[] {
  const normalized = RAW_SNAPSHOT.map((entry) => ({
    address: entry.address,
    amount: entry.amount,
  }));

  normalized.sort((a, b) =>
    a.address.toLowerCase().localeCompare(b.address.toLowerCase())
  );

  return normalized;
}