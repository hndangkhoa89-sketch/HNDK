import React from 'react';
import { Loader2 } from 'lucide-react';

export function TableWrap({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto border-t border-border ${className}`}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className = '',
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
  const alignCls =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <th
      {...rest}
      scope="col"
      className={`whitespace-nowrap bg-muted/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground ${alignCls} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className = '',
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
  const alignCls =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <td {...rest} className={`px-4 py-2.5 ${alignCls} ${className}`}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr {...rest} className={`border-t border-border transition-colors hover:bg-muted/40 ${className}`}>
      {children}
    </tr>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="border-t border-border">
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

type Tone = 'primary' | 'accent' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-muted text-primary border-primary/20',
  accent: 'bg-accent-muted text-accent border-accent/25',
  danger: 'bg-destructive-muted text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Mã định danh: dùng font mono để dễ đối chiếu với file Excel */
export function Code({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-xs text-muted-foreground ${className}`}>{children}</span>;
}

export function StatCard({
  label,
  value,
  unit,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-card border border-border bg-card px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold leading-none tracking-tight">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </p>
        {detail && <p className="mt-1.5 truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      {icon && <span className="shrink-0 text-primary/70">{icon}</span>}
    </div>
  );
}

/** Thanh tỷ lệ nằm ngang, dùng trong bảng thống kê */
export function Meter({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'accent' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${tone === 'accent' ? 'bg-accent' : 'bg-primary'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Spinner({ label = 'Đang tải dữ liệu' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <span className="text-muted-foreground/60">{icon}</span>}
      <div>
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
