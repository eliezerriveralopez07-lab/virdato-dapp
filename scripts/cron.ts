import cron from "node-cron";

console.log("Cron runner started");

cron.schedule("0 2 1 * *", async () => {
  try {
    const epochNumber = Number(process.env.NEXT_EPOCH_NUMBER || "0");
    const res = await fetch("http://localhost:3000/api/admin/run-epoch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-operator-secret": process.env.OPERATOR_SECRET || "",
      },
      body: JSON.stringify({ epochNumber }),
    });

    const json = await res.json();
    console.log("Epoch pipeline result:", json);
  } catch (err) {
    console.error(err);
  }
});