import type { ChartItem } from '../types.ts';

export const PALETTE = ['#6d4aff', '#ff7a3d', '#14b8a6', '#f5a524', '#ec4899', '#3b82f6', '#84cc16', '#a78bfa'];

export interface DonutItem {
    label: string;
    value: number;
    color?: string;
}

/** donut chart (SVG) + legend */
export function DonutChart({ items, centerLabel = 'Total' }: { items: DonutItem[]; centerLabel?: string }) {
    let total = 0;
    for (const item of items) {
        total += item.value;
    }
    const size = 170;
    const stroke = 24;
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    let offset = 0;
    const segs = items.map((it, i) => {
        let len;
        if (total) {
            len = (it.value / total) * C;
        } else {
            len = 0;
        }
        const s = { ...it, color: it.color || PALETTE[i % PALETTE.length], len, offset };
        offset += len;
        return s;
    });

    return (
        <div className="d-flex align-items-center flex-wrap gap-4 justify-content-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0edfb" strokeWidth={stroke} />
                {total > 0 && (
                    <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                        {segs.map((s, i) => (
                            <circle
                                key={i}
                                cx={size / 2}
                                cy={size / 2}
                                r={r}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={stroke}
                                strokeDasharray={`${s.len} ${C - s.len}`}
                                strokeDashoffset={-s.offset}
                            />
                        ))}
                    </g>
                )}
                <text x="50%" y="48%" textAnchor="middle" fontSize="28" fontWeight="800" fill="#1d1740">{total}</text>
                <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="#8681a8">{centerLabel}</text>
            </svg>
            <div className="chart-legend">
                {segs.map((s, i) => {
                    let percentage = 0;
                    if (total) {
                        percentage = Math.round((s.value / total) * 100);
                    }
                    return (
                        <div key={i} className="d-flex align-items-center gap-2 mb-1">
                            <span className="legend-dot" style={{ background: s.color }}></span>
                            <span className="flex-grow-1">{s.label}</span>
                            <span className="fw-semibold">{s.value}</span>
                            <span className="text-muted small" style={{ width: '42px', textAlign: 'right' }}>{percentage}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** horizontal bars */
export function BarList({ items, format = String, color = PALETTE[0] }: {
    items: ChartItem[];
    format?: (n: number) => string;
    color?: string;
}) {
    if (!items.length) {
        return <div className="text-muted small">No data</div>;
    }
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
        <>
            {items.map((it, i) => (
                <div key={i} className="bar-row">
                    <div className="d-flex justify-content-between small mb-1">
                        <span>{it.label}</span><span className="fw-semibold">{format(it.value)}</span>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(it.value / max) * 100}%`, background: color }}></div></div>
                </div>
            ))}
        </>
    );
}

/** column chart (SVG) */
export function ColumnChart({ items, color = PALETTE[0] }: { items: ChartItem[]; color?: string }) {
    if (!items.length) {
        return <div className="text-muted small">No data</div>;
    }
    const W = 520;
    const H = 220;
    const padTop = 24;
    const padBottom = 28;
    const max = Math.max(1, ...items.map((i) => i.value));
    const slot = W / items.length;
    const barW = Math.min(44, slot * 0.6);
    const chartH = H - padTop - padBottom;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ maxHeight: '260px' }}>
            {[0, 0.5, 1].map((t) => {
                const y = padTop + chartH * (1 - t);
                return <line key={t} x1="0" x2={W} y1={y} y2={y} stroke="#f0edfb" />;
            })}
            {items.map((it, i) => {
                const h = (it.value / max) * chartH;
                const x = i * slot + (slot - barW) / 2;
                const y = padTop + chartH - h;
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barW} height={h} rx="8" fill={color} />
                        <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1d1740">{it.value}</text>
                        <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#8681a8">{it.label}</text>
                    </g>
                );
            })}
        </svg>
    );
}
