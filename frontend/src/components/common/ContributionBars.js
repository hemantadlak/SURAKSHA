import { TONE_HEX, toneFromScore10 } from "@/lib/format";

/**
 * rows: [{ label, score (0-10), weight, contribution | weighted, hint }]
 * mode: 'contribution' shows weighted contribution to a 0-100 total; 'score' shows raw 0-10 score.
 */
export const ContributionBars = ({ rows, mode = "contribution", max, testId = "contribution-bars", showWeight = true }) => {
  if (!rows?.length) return null;
  const values = rows.map((r) => (mode === "score" ? r.score : r.contribution ?? r.weighted ?? 0));
  const m = max || Math.max(...values, 1);
  return (
    <div className="space-y-2" data-testid={testId}>
      {rows.map((r, i) => {
        const v = values[i];
        const tone = toneFromScore10(r.score);
        return (
          <div key={r.label || i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3" data-testid="risk-factor-bar">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-foreground/85">{r.label}</span>
                {showWeight && r.weight !== undefined && <span className="text-[10px] text-foreground/50 font-mono">w {Math.round(r.weight * 100)}%</span>}
              </div>
              <div className="bar-track mt-1">
                <div className="bar-fill" style={{ width: `${Math.max(2, (v / m) * 100)}%`, background: TONE_HEX[tone] }} />
              </div>
              {r.hint && <div className="mt-0.5 text-[10px] text-foreground/50 truncate">{r.hint}</div>}
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums text-xs text-foreground/90">{mode === "score" ? `${Number(r.score).toFixed(1)}/10` : `+${Number(v).toFixed(1)}`}</div>
              {mode !== "score" && r.score !== undefined && <div className="font-mono text-[10px] text-foreground/45">{Number(r.score).toFixed(1)}/10</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
