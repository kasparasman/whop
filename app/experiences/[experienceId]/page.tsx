"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { UserIdentity, WalletVerificationResult } from "@/lib/types";
import { VERIFICATION_MESSAGE } from "@/lib/wallet-verification";
import { useAccount, useSignMessage, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useSearchParams } from "next/navigation";

const ACT_TOKEN_ADDRESS = "0xa84e264117442bea8e93f3981124695b693f0d77";
const MIN_USD_VALUE = Number(process.env.NEXT_PUBLIC_ACT_THRESHOLD_USD || 10);

export default function ExperiencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const experienceId = params?.experienceId as string | undefined;
  const currentQueryString = searchParams?.toString() ? `?${searchParams.toString()}` : "";

  const { address: connectedAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Fetch user's ACT balance
  const { data: balance } = useReadContract({
    address: ACT_TOKEN_ADDRESS as `0x${string}`,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    }],
    functionName: 'balanceOf',
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [actStats, setActStats] = useState<{ price: number; marketCap: number; liquidity: number; holders: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    Promise.all([fetchIdentity(), fetchPrice()]);
  }, []);

  const fetchPrice = async () => {
    try {
      const response = await fetch(`/api/act-price${currentQueryString}`);
      const data = await response.json();
      if (data.price) setActStats(data);
    } catch (err) {
      console.error("Failed to fetch ACT stats:", err);
    }
  };

  const fetchIdentity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use experienceId in the request to check correct product access
      const separator = currentQueryString.includes('?') ? '&' : '?';
      const url = `/api/user${currentQueryString}${experienceId ? `${separator}experienceId=${experienceId}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Access denied. This app requires a purchase.");
        } else {
          setError("Failed to load user data.");
        }
        return;
      }

      const data = await response.json();
      setIdentity(data);
    } catch (err) {
      setError("Failed to load user data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWallet = async () => {
    if (!isConnected || !connectedAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      const message = VERIFICATION_MESSAGE;

      // On mobile, we might need to "kick" the app into focus if the user isn't in the MM browser
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isMMBrowser = (window as any).ethereum?.isMetaMask && !(/Whop/i.test(navigator.userAgent));

      if (isMobile && !isMMBrowser) {
        // Short delay to allow the sign request to be pending, then trigger the deep link to bring MM to front
        setTimeout(() => {
          const dappUrl = window.location.host + window.location.pathname + window.location.search;
          window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
        }, 500);
      }

      // Request signature using wagmi
      const signature = await signMessageAsync({
        message,
      });

      // Send to server for verification
      const response = await fetch(`/api/verify-wallet${currentQueryString}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: connectedAddress,
          signature,
        }),
      });

      const result: WalletVerificationResult = await response.json();

      if (result.success) {
        setSuccess(result.message || "Verification successful. You are now a Publisher.");
        // Refresh identity to show new status
        await fetchIdentity();
      } else {
        setError(result.message || result.error || "Verification failed");
      }
    } catch (err) {
      console.error("Verification error:", err);
      if (err instanceof Error && (err.message.includes("User rejected") || err.message.includes("rejected"))) {
        setError("Signature request was cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to verify wallet");
      }
    } finally {
      setVerifying(false);
    }
  };

  const openInMetamask = () => {
    const dappUrl = window.location.host + window.location.pathname + window.location.search;
    const metamaskUrl = `https://metamask.app.link/dapp/${dappUrl}`;
    window.open(metamaskUrl, "_blank");
  };

  const shortenAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[--anthro-cyan] border-t-transparent animate-spin" />
          <div className="text-zinc-500 font-light tracking-wide">Initializing Identity...</div>
        </div>
      </div>
    );
  }

  if (error && !identity) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center px-6">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl">
          <h1 className="text-3xl font-light text-white mb-4 tracking-tight">
            Access <span className="text-[--anthro-magenta]">Denied</span>
          </h1>
          <p className="text-zinc-400 font-light leading-relaxed mb-6">{error}</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alive-gradient">
      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-fade-in-up">
          <div>
            <h1 className="text-5xl md:text-6xl font-light tracking-tight mb-3 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <span className="text-gradient-anthro font-normal">Identity</span> & Status
            </h1>
            <p className="text-zinc-400 text-lg font-light max-w-md leading-relaxed">
              Control app — single source of truth for eligibility in AnthropoCity.
            </p>
            {experienceId && (
              <div className="hidden"></div>
            )}
          </div>

          {actStats && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in-up delay-100">
              {/* Holders */}
              <div className="glass-panel px-5 py-3 rounded-2xl flex flex-col items-center min-w-[100px] transition-all duration-300 hover:bg-white/5 group">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-widest group-hover:text-[--anthro-magenta] transition-colors">Holders</div>
                <div className="text-lg font-light text-white">{actStats.holders}</div>
              </div>

              {/* Market Cap */}
              <div className="glass-panel px-5 py-3 rounded-2xl flex flex-col items-center min-w-[120px] transition-all duration-300 hover:bg-white/5 group">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-widest group-hover:text-[--anthro-purple] transition-colors">Mkt Cap</div>
                <div className="text-lg font-light text-white">${actStats.marketCap >= 1000 ? `${(actStats.marketCap / 1000).toFixed(1)}K` : actStats.marketCap.toFixed(0)}</div>
              </div>

              {/* Liquidity */}
              <div className="glass-panel px-5 py-3 rounded-2xl flex flex-col items-center min-w-[120px] transition-all duration-300 hover:bg-white/5 group">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-widest group-hover:text-[--anthro-cyan] transition-colors">Liquidity</div>
                <div className="text-lg font-light text-white">${actStats.liquidity.toFixed(0)}</div>
              </div>

              {/* Price */}
              <div className="glass-panel px-5 py-3 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-[--anthro-cyan] hover:shadow-[0_0_15px_rgba(0,188,212,0.3)] group cursor-default">
                <div className="relative w-3 h-3">
                  <span className="absolute inset-0 rounded-full bg-[--anthro-cyan] animate-ping opacity-75"></span>
                  <span className="absolute inset-0 rounded-full bg-[--anthro-cyan] shadow-[0_0_10px_#00bcd4]"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none mb-1 tracking-widest group-hover:text-[--anthro-cyan] transition-colors">
                    Price
                  </span>
                  <span className="text-xl font-mono font-light text-white leading-none tracking-tight">
                    ${actStats.price.toFixed(10)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Identity Display */}
        {identity && (
          <div className="glass-panel rounded-3xl p-8 space-y-8 animate-fade-in-up delay-200">
            <h2 className="text-2xl font-light text-white tracking-wide border-b border-zinc-800 pb-4">
              Identity Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Platform Account</div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-light">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Connected
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Current Status</div>
                <div className={`text-2xl font-light ${identity.status === 'Publisher' ? 'text-[--anthro-purple]' : 'text-zinc-300'}`}>
                  {identity.status}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Verification</div>
                <div className="text-lg">
                  {identity.actVerification.verified ? (
                    <span className="inline-flex items-center gap-2 text-[--anthro-cyan]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Verified Publisher
                    </span>
                  ) : (
                    <span className="text-zinc-500">Not verified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Details */}
            {identity.actVerification.verified && identity.actVerification.walletAddress && (
              <div className="pt-6 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Wallet</div>
                  <div className="text-xs font-mono text-zinc-400">{identity.actVerification.walletAddress}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Network</div>
                  <div className="text-xs font-mono text-zinc-400">{identity.actVerification.network}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACT Wallet Verification */}
        {identity && identity.status === "Member" && (
          <div className="glass-panel rounded-3xl p-8 space-y-8 animate-fade-in-up delay-300 border-gradient-anthro glow-breathing">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h2 className="text-2xl font-light text-white tracking-wide mb-2">
                  Upgrade to Publisher
                </h2>
                <p className="text-zinc-400 font-light max-w-xl">
                  Verify ownership of <strong className="text-white">${MIN_USD_VALUE.toFixed(2)} USD</strong> worth of ACT tokens to unlock exclusive Publisher access.
                </p>
              </div>

            </div>

            {isConnected && balance !== undefined && actStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-sm text-zinc-500">Your Holdings</span>
                  <div className="mt-2 text-3xl font-light text-white">
                    {parseFloat(formatUnits(balance as bigint, 18)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-lg text-zinc-600">ACT</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${(parseFloat(formatUnits(balance as bigint, 18)) * actStats.price) >= MIN_USD_VALUE ? 'from-green-500/20 to-transparent' : 'from-red-500/10 to-transparent'
                    } blur-2xl -mr-10 -mt-10 rounded-full`}></div>

                  <span className="text-sm text-zinc-500">USD Value</span>
                  <div className="flex items-end gap-3 mt-2">
                    <div className={`text-3xl font-light ${(parseFloat(formatUnits(balance as bigint, 18)) * actStats.price) >= MIN_USD_VALUE ? 'text-green-400' : 'text-zinc-300'
                      }`}>
                      ${(parseFloat(formatUnits(balance as bigint, 18)) * actStats.price).toFixed(2)}
                    </div>
                    <div className="text-xs font-mono uppercase tracking-widest mb-1.5 opacity-60">
                      {(parseFloat(formatUnits(balance as bigint, 18)) * actStats.price) >= MIN_USD_VALUE ? 'Eligible' : 'Insufficient'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-200 text-sm font-light">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-200 text-sm font-light">{success}</p>
              </div>
            )}

            {!isConnected ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-black/40">
                <ConnectButton label="Connect Wallet to Verify" />

                <div className="mt-8 pt-8 border-t border-zinc-800/50 w-full text-center">
                  <p className="text-xs text-zinc-500 mb-4 font-light tracking-wide italic">
                    Experiencing issues with the Metamask button?
                  </p>
                  <button
                    onClick={openInMetamask}
                    className="text-xs font-bold text-[--anthro-cyan] hover:text-white transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-5 17l1-5h-2l5-7-1 5h2l-5 7z" /></svg>
                    Open in Metamask Browser
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  onClick={handleVerifyWallet}
                  disabled={verifying || (balance !== undefined && actStats !== null && (parseFloat(formatUnits(balance as bigint, 18)) * actStats.price) < MIN_USD_VALUE)}
                  className="flex-1 px-8 py-4 btn-epicenter text-white font-bold tracking-wide rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : "Verify Holdings"}
                </button>

                {/* Buy ACT Button for ineligible users */}
                {balance !== undefined && actStats !== null && (parseFloat(formatUnits(balance as bigint, 18)) * actStats.price) < MIN_USD_VALUE && (
                  <a
                    href="https://app.uniswap.org/swap?chain=arbitrum&inputCurrency=NATIVE&outputCurrency=0x661441c41dc374c8a80f3f2f522cfa02de9f4952"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl border border-zinc-800 transition-all active:scale-[0.98] group"
                  >
                    <span>Buy ACT</span>
                    <svg className="w-4 h-4 text-[--anthro-cyan] group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </a>
                )}

                <div className="md:hidden flex justify-center mt-4">
                  <ConnectButton showBalance={false} accountStatus="avatar" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 animate-fade-in-up delay-300">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Eligibility Criteria</h3>
            <p className="text-zinc-400 text-sm font-light leading-relaxed">
              {identity && identity.status === "Member"
                ? "Hold minimum required value in ACT tokens on Arbitrum to unlock Publisher tools."
                : "You have verified your holdings and have full Publisher access."}
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">System Rules</h3>
            <ul className="space-y-2 text-zinc-400 text-sm font-light">
              <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[--anthro-magenta] rounded-full"></span>Verification required for work</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[--anthro-cyan] rounded-full"></span>Decisions are final</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
