import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (newValue: number) => void;
  hoverOnly?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  min = -5.0,
  max = 5.0,
  step = 0.1,
  onChange,
  hoverOnly = false,
  onMouseEnter,
  onMouseLeave,
  className
}) => {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveStep = e.shiftKey ? 0.5 : step;
    const next = Math.max(min, Math.round((value - effectiveStep) * 10) / 10);
    onChange(next);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveStep = e.shiftKey ? 0.5 : step;
    const next = Math.min(max, Math.round((value + effectiveStep) * 10) / 10);
    onChange(next);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0);
  };

  const isPositive = value > 0;
  const isNegative = value < 0;
  const hasBias = value !== 0;

  const valueFormatted = isPositive ? `+${value.toFixed(1)}` : value.toFixed(1);

  // When hoverOnly is true and value is 0, hide via opacity without changing layout space
  const visibilityClass = hoverOnly && !hasBias
    ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150'
    : 'opacity-100 transition-opacity duration-150';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`inline-flex items-center rounded-lg bg-[#0E1118] border p-0.5 select-none ${visibilityClass} ${
        className ? className : 'border-[#1E2538] shadow-inner'
      }`}
      title="Click + / - to adjust bias (Hold Shift for ±0.5)"
    >
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        title="Decrease bias (-0.1, Shift: -0.5)"
        className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
          value <= min
            ? 'opacity-25 cursor-not-allowed text-[#555E6E]'
            : 'text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 active:scale-90'
        }`}
      >
        <Minus className="w-3 h-3" />
      </button>

      {/* Value Display */}
      <button
        type="button"
        onClick={handleReset}
        title="Click to reset to 0.0"
        className={`px-1.5 py-0.5 font-mono text-xs font-bold rounded transition-colors cursor-pointer min-w-[42px] text-center ${
          isPositive
            ? 'text-[#00F0FF] bg-[#00F0FF]/15'
            : isNegative
            ? 'text-[#F2741D] bg-[#F2741D]/15'
            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
        }`}
      >
        {valueFormatted}
      </button>

      {/* Plus Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        title="Increase bias (+0.1, Shift: +0.5)"
        className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
          value >= max
            ? 'opacity-25 cursor-not-allowed text-[#555E6E]'
            : 'text-[#94A3B8] hover:text-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-90'
        }`}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
