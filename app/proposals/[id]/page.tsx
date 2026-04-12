import Link from "next/link";
import { fetchProposal } from "../../lib/govApi";

export default async function ProposalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { proposal, votes } = await fetchProposal(params.id);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/proposals" className="text-sm text-neutral-600 hover:underline">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">
        {proposal.title || "Untitled proposal"}
      </h1>

      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
        {proposal.description}
      </p>

      <div className="mt-4 text-sm text-neutral-600">
        <div>Proposal ID: {proposal.proposalId}</div>
        <div>Proposer: {proposal.proposer}</div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded border p-3">
          <div className="text-xs text-neutral-500">For</div>
          <div className="text-lg font-semibold">{String(votes?.forVotes ?? 0)}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-neutral-500">Against</div>
          <div className="text-lg font-semibold">{String(votes?.againstVotes ?? 0)}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-neutral-500">Abstain</div>
          <div className="text-lg font-semibold">{String(votes?.abstainVotes ?? 0)}</div>
        </div>
      </div>
    </main>
  );
}
