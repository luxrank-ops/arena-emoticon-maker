import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Progress({ value, total, className }: { value: number; total: number; className?: string }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={clsx('h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-cream', className)}>
      <div
        className="h-full rounded-full bg-coral transition-[width] duration-500"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card-flat p-4">
      <p className="text-xs font-bold text-sub">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-sub">{hint}</p> : null}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  desc,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={clsx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <span className="chip mb-3 !border-ink/20 !bg-lemon/40 !text-ink">{eyebrow}</span>
      ) : null}
      <h2 className="h2">{title}</h2>
      {desc ? <p className="mt-3 text-[15px] leading-relaxed text-sub">{desc}</p> : null}
    </div>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'good';
  title: string;
  children?: ReactNode;
}) {
  const styles = {
    info: 'border-sky/60 bg-sky/10',
    warn: 'border-coral/50 bg-coral/10',
    good: 'border-mint/50 bg-mint/10',
  }[tone];
  return (
    <div className={clsx('rounded-2xl border-2 p-4 text-sm leading-relaxed', styles)}>
      <p className="font-black">{title}</p>
      <div className="mt-1 text-ink/80">{children}</div>
    </div>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-line" />
      {label ? <span className="text-[11px] font-bold text-sub">{label}</span> : null}
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
