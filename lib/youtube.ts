export async function getYouTubeStats(channelId: string) {
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    throw new Error("Missing YOUTUBE_API_KEY in .env.local");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        `YouTube API error: ${res.status} ${JSON.stringify(data)}`
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new Error(`Channel not found for ID ${channelId}`);
    }

    const stats = data.items[0].statistics;

    return {
      subscribers: BigInt(stats.subscriberCount ?? "0"),
      views: BigInt(stats.viewCount ?? "0"),
      videos: BigInt(stats.videoCount ?? "0"),
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("YouTube API request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}