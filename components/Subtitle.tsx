/** Plan subtitle ("4 people · Long Island · 90 days · $1,500–5,000") that only wraps between its parts. */
export function Subtitle({ text, className = "mt-1 text-muted" }: { text: string; className?: string }) {
  const parts = text.split(" · ");
  return (
    <p className={className}>
      {parts.map((p, i) => (
        <span key={i} className="whitespace-nowrap">
          {p}
          {i < parts.length - 1 ? " · " : ""}
        </span>
      ))}
    </p>
  );
}
