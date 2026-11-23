import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Progress({ value, total, className }: { value: number; total: number; className?: string }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={clsx('h-2.5 w-full overflow-hidden rounded-full bg-line/70', className)}>
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
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sub/80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">{value}</p>
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
      {eyebrow ? <p className={clsx('eyebrow mb-2', align === 'center' && 'text-center')}>{eyebrow}</p> : null}
      <h2 className="h2">{title}</h2>
      {desc ? <p className="mt-2.5 text-[15px] leading-relaxed text-sub">{desc}</p> : null}
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
    info: 'border-primary/20 bg-primary/[0.05]',
    warn: 'border-hot/25 bg-hot/[0.07]',
    good: 'border-mint/25 bg-mint/[0.07]',
  }[tone];
  return (
    <div className={clsx('rounded-[1.15rem] border p-4 text-sm leading-relaxed', styles)}>
      <p className="font-extrabold tracking-[-0.01em]">{title}</p>
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
