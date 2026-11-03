/** A groove pressed into the surface, filled with the ribbon colour up to `value` (0-100). */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="sb-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
