import Link from "next/link";
import { fetchProposals } from "../lib/govApi";
import AddVirdButton from "../components/AddVirdButton";

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export default async function ProposalsPage() {
  const data = await fetchProposals();
  const items = data.items ?? [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Proposals</h1>
          <p className="text-sm text-neutral-500">Loaded from your gov API.</p>
        </div>

        <div className="flex items-center gap-2">
          <AddVirdButton />
          <Link
            href="/proposals/new"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            New proposal
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-neutral-600">
            No proposals indexed yet.
          </div>
        ) : (
          items.map((p: any) => (
            <Link
              key={p.proposalId}
              href={`/proposals/${p.proposalId}`}
              className="block rounded-xl border p-4 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-medium">
                    {p.title || "Untitled proposal"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600 line-clamp-2">
                    {p.summary || p.description}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    Proposer: {shortAddr(p.proposer)} • ID: {p.proposalId}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}