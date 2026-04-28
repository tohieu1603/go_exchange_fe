'use client';
import { useTradingStore } from '@/stores/trading-store';

const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1D', '1W'];

interface IntervalSelectorProps {
  onIntervalChange?: (interval: string) => void;
}

export function IntervalSelector({ onIntervalChange }: IntervalSelectorProps) {
  const { currentInterval, setInterval } = useTradingStore();

  function handleClick(interval: string) {
    setInterval(interval);
    onIntervalChange?.(interval);
  }

  return (
    <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto no-scrollbar">
      <span className="text-[11px] text-text-muted mr-1 md:mr-2 shrink-0">Time</span>
      {INTERVALS.map((iv) => (
        <button
          key={iv}
          onClick={() => handleClick(iv)}
          className={[
            'px-2.5 md:px-3 h-8 md:h-7 text-[12px] md:text-[11px] font-medium rounded transition-colors duration-150 relative shrink-0',
            currentInterval === iv
              ? 'text-text-primary bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/50',
          ].join(' ')}
        >
          {iv}
          {currentInterval === iv && (
            <span className="absolute bottom-0 left-1.5 right-1.5 h-0.5 bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
