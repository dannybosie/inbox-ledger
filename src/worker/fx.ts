/** Rate to VND: tries open.er-api.com (free, no key), and falls back to the manual fx_<CUR> rate in settings. */
export async function fxRateToVnd(currency: string, settings: Record<string, string>): Promise<number> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      const rate = data.rates?.VND;
      if (data.result === 'success' && rate && rate > 0) return rate;
    }
  } catch {
    // fall back to the manual rate
  }
  const manual = Number(settings['fx_' + currency.toUpperCase()]);
  return manual > 0 ? manual : 0;
}
