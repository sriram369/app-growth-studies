import { DownloadSimpleIcon, ArrowUpRightIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import type { AppAccount } from './types';

export const money = (n: number | null, digits = 2) => n === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const number = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
export const percent = (n: number | null) => n === null ? '—' : `${(n * 100).toFixed(1)}%`;
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const dateLabel = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const startDate = (days: number) => {
  const d = new Date('2026-09-20T12:00:00Z'); d.setUTCDate(d.getUTCDate() - days + 1); return d.toISOString().slice(0, 10);
};
export const rangeLabel = (days: number) => `${dateLabel(startDate(days))} – Sep 20, 2026`;

export function downloadText(text: string, name: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AppIcon({ app, large = false }: { app: AppAccount; large?: boolean }) {
  return <span className={`app-icon ${large ? 'large' : ''}`} style={{ backgroundColor: app.color }} aria-hidden="true">{app.initials}</span>;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}
export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
export function Download({ path, children, primary = false }: { path: string; children: ReactNode; primary?: boolean }) {
  return <a className={`button ${primary ? 'primary' : 'secondary'}`} href={asset(path)} download><DownloadSimpleIcon size={16} />{children}</a>;
}
export function External({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRightIcon size={14} /></a>;
}
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-heading"><div><a href="#/" className="breadcrumb">Studies <CaretRightIcon size={12} /> {eyebrow}</a><h1>{title}</h1><p>{description}</p></div>{children && <div className="heading-actions">{children}</div>}</header>;
}
export function Trend({ data, field, label, currency = false }: { data: Record<string, unknown>[]; field: string; label: string; currency?: boolean }) {
  return <div className="trend" role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={data} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
        <defs><linearGradient id={`fill-${field}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0071e3" stopOpacity={.2} /><stop offset="100%" stopColor="#0071e3" stopOpacity={.01} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#ececf0" strokeDasharray="3 5" />
        <XAxis dataKey="name" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={45} tick={{ fontSize: 11, fill: '#65656b' }} dy={8} />
        <YAxis width={48} tickFormatter={(v: number) => currency ? `$${v}` : number(v)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#65656b' }} />
        <Tooltip labelFormatter={v => dateLabel(String(v))} formatter={v => [currency ? money(Number(v)) : number(Number(v)), label]} contentStyle={{ borderRadius: 12, borderColor: '#e5e5ea', fontSize: 12 }} />
        <Area type="monotone" dataKey={field} stroke="#0071e3" fill={`url(#fill-${field})`} strokeWidth={2.5} isAnimationActive={false} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
