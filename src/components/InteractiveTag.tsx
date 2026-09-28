import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { NumberStepper } from './NumberStepper.tsx';

interface InteractiveTagProps {
  label: string;
  valueDisplay: string;
  bias: number;
  min?: number;
  max?: number;
  step?: number;
  variant?: 'cyan' | 'orange' | 'default';
  badge?: string;
  onBiasChange: (newValue: number) => void;
  onRemove?: () => void;
  onStepperEnter?: () => void;
  onStepperLeave?: () => void;
}

export const InteractiveTag: React.FC<InteractiveTagProps> = ({
  label,
  valueDisplay,
  bias,
  min = -100.0,
  max = 100.0,
  step = 0.1,
  variant = 'cyan',
  badge,
  onBiasChange,
  onRemove,
  onStepperEnter,
  onStepperLeave
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (!isOpen && !enterTimerRef.current) {
      enterTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        onStepperEnter?.();
        enterTimerRef.current = null;
      }, 50);
    }
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (isOpen) {
      setIsOpen(false);
      onStepperLeave?.();
    }
  };

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  const variantStyles = {
    cyan: {
      tag: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30 hover:border-[#00F0FF]/60',
      dot: 'bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]',
      stepperBorder: 'border-[#00F0FF]/50 shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_12px_rgba(0,240,255,0.25)]',
      removeHover: 'hover:text-[#F2741D] hover:bg-[#F2741D]/20'
    },
    orange: {
      tag: 'bg-[#F2741D]/10 text-[#F2741D] border-[#F2741D]/30 hover:border-[#F2741D]/60',
      dot: 'bg-[#F2741D] shadow-[0_0_6px_#F2741D]',
      stepperBorder: 'border-[#F2741D]/50 shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_12px_rgba(242,116,29,0.25)]',
      removeHover: 'hover:text-[#BD4214] hover:bg-[#BD4214]/20'
    },
    default: {
      tag: 'bg-[#0E1118] text-[#F1F5F9] border-[#1E2538] hover:border-[#00F0FF]/40',
      dot: bias > 0 ? 'bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]' : 'bg-[#F2741D] shadow-[0_0_6px_#F2741D]',
      stepperBorder: 'border-[#00F0FF]/50 shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_12px_rgba(0,240,255,0.25)]',
      removeHover: 'hover:text-[#F2741D] hover:bg-[#F2741D]/20'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative max-w-full px-3.5 py-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 font-mono shadow-sm cursor-default select-none transition-all ${style.tag}`}
    >
      <span className="truncate min-w-0" title={label}>{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 opacity-75 shrink-0 uppercase tracking-wider">
          {badge}
        </span>
      )}
      <span className="font-bold text-[11px] shrink-0 tabular-nums min-w-[40px] text-right">{valueDisplay}</span>

      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity duration-150 ${style.dot} ${
          bias !== 0 ? 'opacity-100' : 'opacity-0'
        }`}
        title={bias !== 0 ? `Manual bias: ${bias > 0 ? `+${bias.toFixed(1)}` : bias.toFixed(1)}` : undefined}
        aria-hidden={bias === 0}
      />

      {/* Floating Stepper Badge (Debounced 100ms hover, docked badge on top right) */}
      <div
        className={`absolute bottom-full right-0 -mb-1 z-40 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto transition-all duration-150'
            : 'opacity-0 translate-y-1 pointer-events-none'
        }`}
      >
        <div className={`relative flex items-center rounded-lg bg-[#0E1118] border p-0.5 select-none ${style.stepperBorder}`}>
          <NumberStepper
            value={bias}
            min={min}
            max={max}
            step={step}
            onChange={onBiasChange}
            className="border-none shadow-none bg-transparent"
          />
          <div className="w-[1px] h-4 bg-[#1E2538] mx-0.5" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBiasChange(0);
            }}
            disabled={bias === 0}
            title={bias === 0 ? "Bias is already 0.0" : "Reset bias to 0.0"}
            className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
              bias === 0
                ? 'opacity-30 cursor-not-allowed text-[#555E6E]'
                : 'text-[#94A3B8] hover:text-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-90'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove to library pool"
              className={`w-6 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer active:scale-90`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
