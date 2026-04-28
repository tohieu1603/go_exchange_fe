// Parse trading pair like "BTC_USDT" into base and quote currencies
export function parsePair(pair: string): [string, string] {
  if (pair.includes('_')) {
    const parts = pair.split('_');
    return [parts[0], parts.slice(1).join('_')];
  }
  // Fallback: last 4 chars as quote (USDT), rest as base
  if (pair.endsWith('USDT')) return [pair.slice(0, -4), 'USDT'];
  if (pair.endsWith('VND')) return [pair.slice(0, -3), 'VND'];
  return [pair.slice(0, -3), pair.slice(-3)];
}
