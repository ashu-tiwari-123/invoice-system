import { formatCurrency } from "./FormatUtilities";

export function cls(...a) { return a.filter(Boolean).join(" "); }

export function Label({ children }) {
    return <label className="block text-xs text-gray-600 mb-1">{children}</label>;
}
export function Input({ value, onChange, placeholder, type = "text", readOnly, className, onFocus }) {
    return (
        <input
            type={type}
            readOnly={readOnly}
            onFocus={onFocus}
            className={cls(
                "w-full border rounded-lg px-2.5 py-2 bg-white",
                "focus:outline-none focus:ring-2",
                "focus:ring-[var(--color-primary)] border-[var(--color-border)]",
                readOnly && "bg-gray-50 text-gray-600",
                className
            )}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
        />
    );
}
export function Textarea({ value, onChange, placeholder, rows = 3 }) {
    return (
        <textarea
            className={"w-full border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] border-[var(--color-border)]"}
            rows={rows}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
        />
    );
}
export function Select({ value, onChange, options, className, renderOption }) {
    return (
        <select
            className={cls("w-full border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] border-[var(--color-border)]", className)}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
        >
            {options.map((o) => (
                <option key={String(renderOption ? renderOption(o) : o)} value={typeof o === "object" ? o.value ?? o : o}>
                    {renderOption ? renderOption(o) : o}
                </option>
            ))}
        </select>
    );
}

export function Field({ label, value, onChange, placeholder }) {
    return (
        <div className="mb-2">
            <Label>{label}</Label>
            <Input value={value} onChange={onChange} placeholder={placeholder} />
        </div>
    );
}

export function TotalCard({ label, value }) {
    return (
        <div className="p-3 rounded-xl border bg-white">
            <div className="text-xs text-gray-600">{label}</div>
            <div className="text-lg font-semibold">{formatCurrency(value)}</div>
        </div>
    );
}