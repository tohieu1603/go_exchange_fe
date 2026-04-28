export function Loading({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center">
      <span
        className={`${sizeMap[size]} border-2 border-bg-tertiary border-t-accent rounded-full animate-spin`}
      />
    </div>
  );
}
