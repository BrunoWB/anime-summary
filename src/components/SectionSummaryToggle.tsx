import React from 'react';

interface SectionSummaryToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label?: string;
  className?: string;
}

export const SectionSummaryToggle: React.FC<SectionSummaryToggleProps> = ({
  enabled,
  onToggle,
  label = 'In Summary',
  className = ''
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!enabled);
      }}
      title={
        enabled
          ? 'Section included in LLM summary prompt & markdown export. Click to exclude.'
          : 'Section excluded from LLM summary prompt & markdown export. Click to include.'
      }
      className={`flex items-center gap-2 text-xs font-mono select-none cursor-pointer group py-0.5 px-1.5 rounded transition-all ${
        enabled
          ? 'hover:bg-[#00F0FF]/10'
          : 'hover:bg-white/5 opacity-70 hover:opacity-100'
      } ${className}`}
    >
      <span
        className={`text-[10px] tracking-wider uppercase transition-colors ${
          enabled
            ? 'text-[#94A3B8] group-hover:text-[#00F0FF]'
            : 'text-[#555E6E] line-through'
        }`}
      >
        {enabled ? label : 'Excluded'}
      </span>
      <div
        className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center ${
          enabled
            ? 'bg-[#00F0FF]/25 border border-[#00F0FF]/50'
            : 'bg-[#1E2538] border border-[#2A344A]'
        }`}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ease-in-out ${
            enabled
              ? 'translate-x-3 bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]'
              : 'translate-x-0 bg-[#555E6E]'
          }`}
        />
      </div>
    </button>
  );
};
