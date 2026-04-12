import { addDays } from "date-fns";
import { prisma } from "../../app/lib/prisma";
import { ingestYouTubeForWindow } from "./ingestYouTube";
import { buildEpochSnapshot } from "./buildEpochSnapshot";
import { ensureEpochFunding } from "./funding";
import { finalizeEpochOnChain } from "./finalizeEpoch";

export async function runEpochPipeline(epochNumber: number) {
  const existing = await prisma.epoch.findUnique({
    where: { epochNumber },
  });

  let epoch = existing;

  if (!epoch) {
    const periodStart = new Date();
    const periodEnd = addDays(periodStart, 30);

    epoch = await prisma.epoch.create({
      data: {
        epochNumber,
        periodStart,
        periodEnd,
        status: "DRAFT",
      },
    });
  }

  await ingestYouTubeForWindow(epoch.periodStart, epoch.periodEnd);
  await buildEpochSnapshot(epochNumber);
  await ensureEpochFunding(epochNumber);
  await finalizeEpochOnChain(epochNumber);

  await prisma.epoch.update({
    where: { epochNumber },
    data: { status: "CLAIMS_OPEN" },
  });

  return prisma.epoch.findUnique({
    where: { epochNumber },
    include: { claims: true },
  });
}