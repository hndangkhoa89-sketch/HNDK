import React, { useId } from 'react';

const CONTROL =
  'w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed';

export function Field({
  label,
  hint,
  htmlFor,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Input({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${CONTROL} h-10 ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${CONTROL} h-10 cursor-pointer pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${CONTROL} min-h-20 py-2 leading-relaxed ${className}`} />;
}

export function Checkbox({
  className = '',
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <input
        {...rest}
        id={rest.id || id}
        type="checkbox"
        className={`h-4.5 w-4.5 cursor-pointer rounded border-input text-primary accent-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
      {label && (
        <label htmlFor={rest.id || id} className="cursor-pointer text-sm">
          {label}
        </label>
      )}
    </span>
  );
}

/** Ô nhập gọn dùng trực tiếp trong bảng dữ liệu */
export function CellInput({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm transition-colors hover:border-input focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:text-muted-foreground ${className}`}
    />
  );
}
