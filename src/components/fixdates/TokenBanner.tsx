import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface TokenBannerProps {
  token: string;
  verifiedUsername: string | null;
  onTokenChange: (t: string) => void;
  onVerify: () => void;
  onClearToken?: () => void;
  isVerifying: boolean;
  verifyError: string | null;
}

export const TokenBanner: React.FC<TokenBannerProps> = ({
  token,
  verifiedUsername,
  onTokenChange,
  onVerify,
  onClearToken,
  isVerifying,
  verifyError
}) => {
  if (verifiedUsername) {
    return (
      <div className="bg-[#131722] border-l-4 border-l-green-500 border border-[#1E2538] rounded-md p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-sm font-medium text-green-400">
            ✓ Connected as {verifiedUsername} · Token active for this session
          </span>
        </div>
        {onClearToken && (
          <button
            type="button"
            onClick={onClearToken}
            className="text-xs text-[#94A3B8] hover:text-[#F1F5F9] underline transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#131722] border border-amber-500/50 rounded-md p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-3 w-full">
          <p className="text-sm text-amber-200">
            AniList token required to apply changes directly. Get yours at{' '}
            <a href="https://anilist.co/settings/developer" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">
              anilist.co/settings/developer
            </a>{' '}
            → Create Token
          </p>
          <div className="flex gap-2 w-full max-w-md">
            <input
              type="password"
              placeholder="Paste token here..."
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              className="flex-1 bg-[#0B0D13] border border-[#1E2538] rounded-md px-3 py-1.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={onVerify}
              disabled={isVerifying || !token}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {verifyError && <p className="text-sm text-red-500">{verifyError}</p>}
        </div>
      </div>
    </div>
  );
};
