export const metrics = {
  recordDuration(metricName: string, durationMs: number, tags: Record<string, string>) {
    console.log(`[Metric] ${metricName}: ${durationMs}ms`, JSON.stringify(tags));
  },
};
