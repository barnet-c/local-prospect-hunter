// Runs `worker(item)` over `items` with at most `concurrency` in flight at once.
// Errors are caught per-item so one failure never blocks the rest of the batch.
export async function runWorkerPool(items, worker, concurrency = 4, onItemDone) {
  const queue = [...items];
  const results = new Array(items.length);

  async function runOne() {
    while (queue.length) {
      const index = items.length - queue.length;
      const item = queue.shift();
      try {
        results[index] = await worker(item, index);
      } catch (error) {
        results[index] = { error };
      }
      onItemDone?.(item, results[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runOne);
  await Promise.all(workers);
  return results;
}
