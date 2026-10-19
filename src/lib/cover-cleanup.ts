const BATCH = 100;
const LIST_LIMIT = 1000;

export interface DrainResult {
  queued: number;
  removed: number;
  failed: number;
}

interface DrainConfig {
  url: string;
  serviceKey: string;
  fetchImpl?: typeof fetch;
}

/**
 * Deletes the cover files queued in `cover_cleanup_queue` (migration 007) and
 * removes each queue row once its files are gone. A path ending in "/" is a
 * whole user prefix, queued when the client could not even list the files.
 * Rows whose deletion failed stay queued and are retried on the next run.
 */
export async function drainCoverQueue({
  url,
  serviceKey,
  fetchImpl = fetch,
}: DrainConfig): Promise<DrainResult> {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  const queueRes = await fetchImpl(
    `${url}/rest/v1/cover_cleanup_queue?select=path&order=queued_at&limit=500`,
    { headers, cache: "no-store" },
  );
  if (!queueRes.ok) throw new Error(`Queue read failed: ${queueRes.status}`);
  const rows = (await queueRes.json()) as { path: string }[];

  const result: DrainResult = { queued: rows.length, removed: 0, failed: 0 };

  for (const { path } of rows) {
    const ok = await purgeEntry(path);
    if (ok) {
      const del = await fetchImpl(
        `${url}/rest/v1/cover_cleanup_queue?path=eq.${encodeURIComponent(path)}`,
        { method: "DELETE", headers },
      );
      if (del.ok) result.removed += 1;
      else result.failed += 1;
    } else {
      result.failed += 1;
    }
  }
  return result;

  async function purgeEntry(path: string): Promise<boolean> {
    let files = [path];
    let keepRow = false;
    if (path.endsWith("/")) {
      const listRes = await fetchImpl(`${url}/storage/v1/object/list/covers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prefix: path.slice(0, -1), limit: LIST_LIMIT }),
      });
      if (!listRes.ok) return false;
      const listed = (await listRes.json()) as { name: string }[];
      files = listed.map((f) => `${path}${f.name}`);
      keepRow = listed.length >= LIST_LIMIT;
    }
    for (let i = 0; i < files.length; i += BATCH) {
      const res = await fetchImpl(`${url}/storage/v1/object/covers`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ prefixes: files.slice(i, i + BATCH) }),
      });
      if (!res.ok) return false;
    }
    // A full page means more files remain under the prefix: keep the row.
    return !keepRow;
  }
}
