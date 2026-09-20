import { type HTMLAttributes, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-separate border-spacing-0 text-sm', className)} {...props} />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'group transition-colors border-b border-line',
        interactive && 'cursor-pointer hover:bg-bg-3',
        className,
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 bg-bg-3 px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider text-fg-dim border-b border-line whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  align = 'left',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'right' | 'center';
  children?: ReactNode;
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 border-b border-line align-middle text-fg text-xs',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
}
