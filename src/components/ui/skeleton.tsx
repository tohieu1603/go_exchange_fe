export function Skeleton({
  className = '',
  height = 16,
  width = '100%',
}: {
  className?: string;
  height?: number | string;
  width?: number | string;
}) {
  return (
    <div
      className={`shimmer rounded ${className}`}
      style={{
        height,
        width,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-3 py-2">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={14} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg bg-bg-secondary space-y-3">
      <Skeleton height={20} width="40%" />
      <Skeleton height={32} width="70%" />
      <Skeleton height={12} width="30%" />
    </div>
  );
}
