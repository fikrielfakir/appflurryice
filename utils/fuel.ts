import { FuelEntry } from "@/context/AppContext";

export function calcAvgConsumption(entries: FuelEntry[]): number {
  if (entries.length < 2) return 0;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const totalKm = Math.max(...sorted.map(e => e.odometer))
    - Math.min(...sorted.map(e => e.odometer));
  const totalLiters = sorted.slice(1).reduce((sum, e) => sum + e.liters, 0);
  return totalKm > 0 ? (totalLiters / totalKm) * 100 : 0;
}

export function calcMonthConsumption(
  monthEntries: FuelEntry[],
  prevMonthLastEntry?: FuelEntry,
): number {
  if (monthEntries.length === 0) return 0;
  const sorted = [...monthEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const anchor = prevMonthLastEntry ?? sorted[0];
  const totalKm = sorted.at(-1)!.odometer - anchor.odometer;
  const liters = prevMonthLastEntry
    ? sorted.reduce((sum, e) => sum + e.liters, 0)
    : sorted.slice(1).reduce((sum, e) => sum + e.liters, 0);
  return totalKm > 0 ? (liters / totalKm) * 100 : 0;
}

export function calcKmDriven(entries: FuelEntry[]): number {
  if (entries.length < 2) return 0;
  const vals = entries.map(e => e.odometer);
  return Math.max(...vals) - Math.min(...vals);
}

export function calcAvgPricePerLiter(entries: FuelEntry[]): number {
  const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
  if (totalLiters === 0) return 0;
  return entries.reduce((s, e) => s + e.pricePerLiter * e.liters, 0) / totalLiters;
}

export function deriveEntriesWithConsumption(entries: FuelEntry[]): FuelEntry[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return sorted.map((e, i) => {
    if (i === 0) return { ...e };
    const prev = sorted[i - 1];
    const km = e.odometer - prev.odometer;
    const consumption = km > 0 ? (e.liters / km) * 100 : undefined;
    return { ...e, consumption };
  });
}
