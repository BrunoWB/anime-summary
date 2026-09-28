import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FuzzyDate } from '../../types/anilist.ts';
import {
  fuzzyDateLabel,
  fuzzyDateToInputString,
  inputStringToFuzzyDate,
  stepFuzzyDateYear
} from '../../utils/dateUtils.ts';

interface DateInputStepperProps {
  value: FuzzyDate | null | undefined;
  originalValue?: FuzzyDate | null | undefined;
  fallbackDate?: FuzzyDate | null | undefined;
  isPending: boolean;
  onChange: (newValue: FuzzyDate | null) => void;
  disabled?: boolean;
}

const isSameFuzzyDate = (a: FuzzyDate | null | undefined, b: FuzzyDate | null | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.year === b.year && (a.month || null) === (b.month || null) && (a.day || null) === (b.day || null);
};

export const DateInputStepper: React.FC<DateInputStepperProps> = ({
  value,
  originalValue,
  fallbackDate,
  isPending,
  onChange,
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState<FuzzyDate | null | undefined>(value);
  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);
  const localValueRef = useRef<FuzzyDate | null | undefined>(value);
  localValueRef.current = localValue;

  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync from props if external change happens and user is not actively interacting
  useEffect(() => {
    if (!isHoveredRef.current && !isFocusedRef.current) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value]);

  const commitChange = () => {
    if (!isSameFuzzyDate(localValueRef.current, valueRef.current)) {
      onChange(localValueRef.current ?? null);
    }
  };

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!isFocusedRef.current) {
      commitChange();
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (!isHoveredRef.current) {
      commitChange();
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const stepped = stepFuzzyDateYear(localValueRef.current, -1, fallbackDate);
    setLocalValue(stepped);
    localValueRef.current = stepped;
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const stepped = stepFuzzyDateYear(localValueRef.current, 1, fallbackDate);
    setLocalValue(stepped);
    localValueRef.current = stepped;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const parsed = inputStringToFuzzyDate(e.target.value);
    setLocalValue(parsed);
    localValueRef.current = parsed;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const inputStr = fuzzyDateToInputString(localValue);
  const isLocallyPending = !isSameFuzzyDate(localValue, originalValue);
  const showPending = isPending || isLocallyPending;

  return (
    <div
      className="flex flex-col gap-1 items-start"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showPending && (
        <span className="line-through text-[#555E6E] text-[10px] font-mono leading-none px-1">
          {fuzzyDateLabel(originalValue)}
        </span>
      )}

      <div
        className={`inline-flex items-center rounded-lg bg-[#0E1118] border p-0.5 select-none transition-all shadow-inner ${
          showPending
            ? 'border-amber-500/60 bg-amber-500/5 shadow-amber-500/10'
            : 'border-[#1E2538] hover:border-[#2D3748]'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        title="Adjust watch date: pick date or use - / + to step 1 year"
      >
        {/* Step minus 1 year */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleDecrement}
          disabled={disabled}
          title="Step watch date back 1 year (-1y)"
          className="w-6 h-6 flex items-center justify-center rounded transition-all text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Interactive Date Input */}
        <input
          type="date"
          value={inputStr}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`bg-transparent text-xs font-mono px-1 py-0.5 outline-none [color-scheme:dark] cursor-pointer w-[120px] transition-colors ${
            showPending ? 'text-amber-400 font-bold' : 'text-[#F1F5F9]'
          }`}
        />

        {/* Step plus 1 year */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleIncrement}
          disabled={disabled}
          title="Step watch date forward 1 year (+1y)"
          className="w-6 h-6 flex items-center justify-center rounded transition-all text-[#94A3B8] hover:text-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
