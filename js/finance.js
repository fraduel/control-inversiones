export const fmtCurrency = (num) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);

export const fmtPct = (num) => {
  if (num === null || isNaN(num) || !isFinite(num)) return 'N/D';
  const sign = num > 0 ? '+' : '';
  return `${sign}${(num * 100).toFixed(2)}%`;
};

export function calculateXIRR(productEntries, currentValue = 0) {
  const flows = productEntries.map((e) => ({
    amount: e.type === 'SUSCRIPCIÓN' ? -Math.abs(e.amount) : Math.abs(e.amount),
    date: new Date(e.date + 'T00:00:00')
  }));

  if (currentValue > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    flows.push({
      amount: Math.abs(currentValue),
      date: new Date(todayStr + 'T00:00:00')
    });
  }

  if (flows.length < 2) return null;

  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  flows.sort((a, b) => a.date - b.date);
  const d0 = flows[0].date;

  const totalDays = (flows[flows.length - 1].date - d0) / (1000 * 60 * 60 * 24);
  if (totalDays === 0) return null;

  const xnpv = (rate) =>
    flows.reduce((acc, f) => {
      const days = (f.date - d0) / (1000 * 60 * 60 * 24);
      return acc + f.amount / Math.pow(1 + rate, days / 365);
    }, 0);

  const dxnpv = (rate) =>
    flows.reduce((acc, f) => {
      const days = (f.date - d0) / (1000 * 60 * 60 * 24);
      return acc - ((days / 365) * f.amount) / Math.pow(1 + rate, days / 365 + 1);
    }, 0);

  const guesses = [0.1, 0.0, -0.2, 0.5, -0.5];
  for (const guess of guesses) {
    let rate = guess;
    for (let i = 0; i < 100; i++) {
      if (rate <= -1) rate = -0.99;
      const fVal = xnpv(rate);
      if (Math.abs(fVal) < 1e-6) return rate;
      const dfVal = dxnpv(rate);
      if (Math.abs(dfVal) < 1e-10) break;
      const nextRate = rate - fVal / dfVal;
      if (Math.abs(nextRate - rate) < 1e-7) return nextRate;
      rate = nextRate;
    }
  }
  return null;
}

