// Build SVG charts and HTML bars from dashboard values.
import { esc } from './ui.ts';
import type { ChartItem } from '../types.ts';
// Reuse these colours when chart items do not supply their own.
export const PALETTE = ['#6d4aff', '#ff7a3d', '#14b8a6', '#f5a524', '#ec4899', '#3b82f6', '#84cc16', '#a78bfa'];
export interface DonutItem {
    label: string;
    value: number;
    color?: string;
}
/** donut chart (SVG) + legend */
export function donutChart(items: DonutItem[], centerLabel = 'Total'): string {
    // Add all values to calculate the donut total and each slice's share.
    let total = 0;
    for (const item of items) {
        total += item.value;
    }
    // Set the donut size and ring thickness, then calculate its circumference.
    const size = 170;
    const stroke = 24;
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    let offset = 0;
    // Calculate the length, colour and starting offset of each donut slice.
    const segs = items.map((it, i) => {
        let len;
        if (total) {
            len = (it.value / total) * C;
        }
        else {
            len = 0;
        }
        const s = { ...it, color: it.color || PALETTE[i % PALETTE.length], len, offset };
        offset += len;
        return s;
    });
    // Turn slice lengths into SVG circle strokes.
    const circles = segs
        .map((s) => {
        return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}"
       stroke-dasharray="${s.len} ${C - s.len}" stroke-dashoffset="${-s.offset}" />`;
    })
        .join('');
    // Build labels, values and percentages matching the donut colours.
    const legend = segs
        .map((s) => {
        let percentage = 0;
        if (total) {
            percentage = Math.round((s.value / total) * 100);
        }
        return `
    <div class="d-flex align-items-center gap-2 mb-1">
      <span class="legend-dot" style="background:${s.color}"></span>
      <span class="flex-grow-1">${esc(s.label)}</span>
      <span class="fw-semibold">${s.value}</span>
      <span class="text-muted small" style="width:42px;text-align:right">${percentage}%</span>
    </div>`;
    })
        .join('');
    // Draw coloured slices only when there is a positive total.
    let chartSegments = '';
    if (total > 0) {
        chartSegments = `<g transform="rotate(-90 ${size / 2} ${size / 2})">${circles}</g>`;
    }
    return `
  <div class="d-flex align-items-center flex-wrap gap-4 justify-content-center">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#f0edfb" stroke-width="${stroke}" />
      ${chartSegments}
      <text x="50%" y="48%" text-anchor="middle" font-size="28" font-weight="800" fill="#1d1740">${total}</text>
      <text x="50%" y="62%" text-anchor="middle" font-size="11" fill="#8681a8">${esc(centerLabel)}</text>
    </svg>
    <div class="chart-legend">${legend}</div>
  </div>`;
}
/** horizontal bars */
export function barList(items: ChartItem[], opts: {
    format?: (n: number) => string;
    color?: string;
} = {}): string {
    // Use the supplied value formatter and colour, or defaults.
    const { format = String, color = PALETTE[0] } = opts;
    // Show a readable message when there are no chart items.
    if (!items.length) {
        return '<div class="text-muted small">No data</div>';
    }
    // Scale bars against the largest value; use at least 1 to avoid dividing by zero.
    const max = Math.max(1, ...items.map((i) => {
        return i.value;
    }));
    return items
        .map((it) => {
        return `
    <div class="bar-row">
      <div class="d-flex justify-content-between small mb-1">
        <span>${esc(it.label)}</span><span class="fw-semibold">${esc(format(it.value))}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${(it.value / max) * 100}%;background:${color}"></div></div>
    </div>`;
    })
        .join('');
}
/** column chart (SVG) */
export function columnChart(items: ChartItem[], color = PALETTE[0]): string {
    // Show a readable message when there are no chart items.
    if (!items.length) {
        return '<div class="text-muted small">No data</div>';
    }
    // Set the column chart dimensions and space for labels.
    const W = 520;
    const H = 220;
    const padTop = 24;
    const padBottom = 28;
    // Scale bars against the largest value; use at least 1 to avoid dividing by zero.
    const max = Math.max(1, ...items.map((i) => {
        return i.value;
    }));
    // Calculate each column's available width and drawing height.
    const slot = W / items.length;
    const barW = Math.min(44, slot * 0.6);
    const chartH = H - padTop - padBottom;
    // Draw horizontal guide lines behind the columns.
    const grid = [0, 0.5, 1]
        .map((t) => {
        const y = padTop + chartH * (1 - t);
        return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#f0edfb" />`;
    })
        .join('');
    // Calculate column positions and heights, then draw their labels.
    const bars = items
        .map((it, i) => {
        const h = (it.value / max) * chartH;
        const x = i * slot + (slot - barW) / 2;
        const y = padTop + chartH - h;
        return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="8" fill="${color}" />
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d1740">${it.value}</text>
      <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#8681a8">${esc(it.label)}</text>`;
    })
        .join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" style="max-height:260px">${grid}${bars}</svg>`;
}
