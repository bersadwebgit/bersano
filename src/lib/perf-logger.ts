export function logPerf(label: string, startTime: number) {
  const duration = (performance.now() - startTime).toFixed(1);
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_PERF_LOGS === 'true') {
    console.log(`[PERF] ${label}: ${duration}ms`);
  }
}
