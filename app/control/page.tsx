"use client";

import { useState, useEffect } from "react";
import { UserIdentity, WalletVerificationResult } from "@/lib/types";
import { VERIFICATION_MESSAGE } from "@/lib/wallet-verification";
import { getAddress } from "viem";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

export default function ControlApp() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  // Fetch user identity on mount
  useEffect(() => {
    fetchIdentity();
  }, []);

  const fetchIdentity = async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, the proxy or Whop dashboard provides the token via headers
      const response = await fetch("/api/user");

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

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask or another Web3 wallet is required. Please install MetaMask.");
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const address = getAddress(accounts[0]);
        setConnectedAddress(address);
        setError(null);
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  const handleVerifyWallet = async () => {
    if (!connectedAddress) {
      await connectWallet();
      return;
    }

    if (!window.ethereum) {
      setError("MetaMask or another Web3 wallet is required.");
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      // Request signature
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [VERIFICATION_MESSAGE, connectedAddress],
      });

      // Send to server for verification
      const response = await fetch("/api/verify-wallet", {
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
        // Clear wallet connection
        setConnectedAddress(null);
      } else {
        setError(result.message || result.error || "Verification failed");
      }
    } catch (err) {
      console.error("Verification error:", err);
      if (err instanceof Error && err.message.includes("User rejected")) {
        setError("Signature request was cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to verify wallet");
      }
    } finally {
      setVerifying(false);
    }
  };

  const shortenAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error && !identity) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full p-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Access Denied
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Identity & Status
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Control app — single source of truth for eligibility
          </p>
        </div>

        {/* Identity Display */}
        {identity && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Identity (Read-only)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Whop Username</div>
                <div className="text-lg text-zinc-900 dark:text-zinc-100">{identity.username}</div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Whop User ID</div>
                <div className="text-lg text-zinc-900 dark:text-zinc-100 font-mono text-sm">{identity.userId}</div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Current Status</div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {identity.status}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">ACT Verification</div>
                <div className="text-lg text-zinc-900 dark:text-zinc-100">
                  {identity.actVerification.verified ? (
                    <span className="text-green-600 dark:text-green-400">Verified</span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">Not verified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Details */}
            {identity.actVerification.verified && identity.actVerification.walletAddress && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Verification Details</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Wallet Address</div>
                    <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {shortenAddress(identity.actVerification.walletAddress)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Network</div>
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">
                      {identity.actVerification.network}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Token</div>
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">
                      {identity.actVerification.token}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACT Wallet Verification */}
        {identity && identity.status === "Member" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              ACT Wallet Verification
            </h2>

            <p className="text-zinc-600 dark:text-zinc-400">
              Verify your ACT token ownership to gain Publisher access.
            </p>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
              </div>
            )}

            <button
              onClick={handleVerifyWallet}
              disabled={verifying}
              className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying
                ? "Verifying..."
                : connectedAddress
                  ? "Verify ACT Wallet"
                  : "Connect Wallet"}
            </button>

            {connectedAddress && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Connected: {shortenAddress(connectedAddress)}
              </div>
            )}
          </div>
        )}

        {/* Eligibility Explanation */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Eligibility
          </h2>
          {identity && (
            <p className="text-zinc-900 dark:text-zinc-100">
              {identity.status === "Member"
                ? "You are a Member. To access work, verify your ACT holdings."
                : "You are a Publisher. You have access to orders and submissions."}
            </p>
          )}
        </div>

        {/* Rules Summary */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Rules
          </h2>
          <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 text-sm">
            <li>• ACT verification is required to work</li>
            <li>• Access can be revoked at any time</li>
            <li>• IP usage is monitored</li>
            <li>• Decisions are final</li>
            <li>• This is not a discussion forum</li>
          </ul>
        </div>
      </main>
    </div>
  );
}


