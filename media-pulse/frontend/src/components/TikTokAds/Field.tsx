import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}

/** Labeled filter field — wires label to control via htmlFor/id. */
export function Field({ id, label, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[10px] text-slate-500 mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}
