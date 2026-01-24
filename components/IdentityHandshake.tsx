"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    TrendingUp,
    Users,
    Wallet,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    Activity,
    Droplets,
    AlertCircle
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface ActStats {
    price: number;
    marketCap: number;
    liquidity: number;
    holders: number;
}

export function IdentityHandshake() {
    const { address, isConnected } = useAccount();
    const [stats, setStats] = useState<ActStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publisherStatus, setPublisherStatus] = useState<boolean>(false);

    const searchParams = useSearchParams();
    const currentQueryString = searchParams?.toString() ? `?${searchParams.toString()}` : "";

    const { signMessageAsync } = useSignMessage();

    useEffect(() => {
        fetchStats();
        checkUserStatus();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/act-price${currentQueryString}`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            setLoading(false);
        }
    };

    const checkUserStatus = async () => {
        try {
            const res = await fetch(`/api/user${currentQueryString}`);
            const data = await res.json();
            if (data.status === "Publisher") {
                setPublisherStatus(true);
            }
        } catch (err) {
            console.error("Failed to check status", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!address) return;
        setVerifying(true);
        setError(null);

        try {
            const message = `Verify your ownership of ACT token.\nTimestamp: ${Date.now()}`;

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

            const signature = await signMessageAsync({ message });

            const res = await fetch(`/api/verify-wallet${currentQueryString}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature }),
            });

            const result = await res.json();

            if (result.success) {
                setPublisherStatus(true);
            } else {
                setError(result.message || "Verification failed");
            }
        } catch (err: any) {
            console.error("Verification error:", err);
            if (err.message?.includes("rejected")) {
                setError("Signature request was cancelled.");
            } else {
                setError(err.message || "An error occurred");
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

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-20 relative">
            {/* Background Orbs */}
            <div className="absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden h-[500px]">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="w-[600px] h-[600px] bg-[#bd00ff]/20 rounded-full blur-[120px] -translate-y-1/2"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="w-[500px] h-[500px] bg-[#00fff2]/15 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4"
                />
            </div>

            <div className="flex flex-col items-center gap-12 text-center">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.2em] uppercase text-[#00fff2]">
                        <Activity className="w-3 h-3" />
                        Core Analytics Engine
                    </div>
                    <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-white">
                        Identity <span className="text-[#00fff2]">&</span> Status
                    </h1>
                    <p className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
                        AnthropoCity flag-ship terminal. Real-time telemetry and decentralized verification for the ACT protocol.
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <StatCard
                        label="HOLDERS"
                        value={stats?.holders.toString() || "---"}
                        icon={<Users className="w-4 h-4 text-[#ff0055]" />}
                        loading={loading}
                    />
                    <StatCard
                        label="MKT CAP"
                        value={stats ? `$${(stats.marketCap / 1000).toFixed(1)}K` : "---"}
                        icon={<TrendingUp className="w-4 h-4 text-[#bd00ff]" />}
                        loading={loading}
                    />
                    <StatBox
                        label="LIQUIDITY"
                        value={stats ? `$${stats.liquidity.toFixed(0)}` : "---"}
                        icon={<Droplets className="w-4 h-4 text-[#00fff2]" />}
                        loading={loading}
                    />
                </div>

                {/* Price Hero */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="w-full relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#bd00ff] to-[#00fff2] rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col items-center p-12 rounded-[2rem] bg-[#080808]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-[#00fff2] animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">LIVE PRICE TICKER</span>
                        </div>
                        <div className="text-5xl md:text-7xl font-light tracking-tight font-mono text-white mb-2">
                            {stats ? `$${stats.price.toFixed(10)}` : "---"}
                        </div>
                        <div className="text-xs text-zinc-600 font-medium tracking-wide">$ACT PROTOCOL TOKEN</div>
                    </div>
                </motion.div>

                {/* Identity Section */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-20">
                    {/* Status Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col justify-between text-left relative overflow-hidden group shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield className="w-64 h-64 -rotate-12" />
                        </div>

                        <div className="relative space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Current Profile</span>
                                <h3 className="text-3xl font-light text-white">Identity Status</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between py-6 border-b border-white/5">
                                    <span className="text-sm font-light text-zinc-500 uppercase tracking-widest">Platform Account</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                        <span className="text-sm text-zinc-300 font-light">Connected</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-6">
                                    <span className="text-sm font-light text-zinc-500 uppercase tracking-widest">Global Status</span>
                                    <div className={cn(
                                        "px-4 py-1.5 rounded-full text-sm font-medium tracking-wider",
                                        publisherStatus ? "bg-[#bd00ff]/10 text-[#bd00ff] border border-[#bd00ff]/20" : "bg-white/5 text-zinc-400 border border-white/10"
                                    )}>
                                        {publisherStatus ? "PUBLISHER" : "MEMBER"}
                                    </div>
                                </div>
                            </div>

                            {publisherStatus && address && (
                                <div className="pt-8">
                                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-zinc-600 truncate flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Wallet className="w-3 h-3" />
                                            {address}
                                        </span>
                                        <CheckCircle2 className="w-3 h-3 text-[#00fff2]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Verification Portal */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="p-10 rounded-[2.5rem] bg-black border border-[#00fff2]/10 flex flex-col gap-8 text-left h-full shadow-[0_0_50px_-12px_rgba(0,255,242,0.1)]">
                            <div className="space-y-4">
                                <h3 className="text-3xl font-light text-white">Verification Engine</h3>
                                <p className="text-zinc-500 font-light leading-relaxed">
                                    Prove ownership of $ACT token to unlock Publisher-tier status. Assets must be held on <span className="text-white">Arbitrum One</span>.
                                </p>
                            </div>

                            <div className="mt-4 p-6 rounded-2xl bg-[#00fff2]/5 border border-[#00fff2]/10">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-[#00fff2]/10 text-[#00fff2]">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium text-white tracking-wide">Threshold Requirement</div>
                                        <div className="text-xs text-zinc-500 leading-relaxed font-light">
                                            Must maintain a balance of at least <span className="text-[#00fff2] font-semibold">$10.00 USD</span> in ACT protocols.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4">
                                {!isConnected ? (
                                    <div className="w-full scale-110 origin-left">
                                        <ConnectButton />
                                    </div>
                                ) : (
                                    <button
                                        disabled={verifying || publisherStatus}
                                        onClick={handleVerify}
                                        className={cn(
                                            "w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-bold tracking-widest text-sm uppercase",
                                            publisherStatus
                                                ? "bg-[#00fff2]/10 text-[#00fff2] border border-[#00fff2]/20 cursor-default"
                                                : verifying
                                                    ? "bg-white/5 text-zinc-500 border border-white/10 cursor-wait"
                                                    : "bg-white text-black hover:bg-[#00fff2] hover:text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.2)]"
                                        )}
                                    >
                                        {publisherStatus ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Status Verified
                                            </>
                                        ) : verifying ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Activity className="w-4 h-4" />
                                                </motion.div>
                                                Authorizing...
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="w-4 h-4" />
                                                Execute Verification
                                            </>
                                        )}
                                    </button>
                                )}

                                {error && (
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-light">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <a
                                    href="https://app.uniswap.org/swap?chain=arbitrum&inputCurrency=NATIVE&outputCurrency=0xa84e264117442bea8e93f3981124695b693f0d77"
                                    target="_blank"
                                    className="w-full py-4 flex items-center justify-center gap-2 text-zinc-600 hover:text-[#00fff2] transition-colors text-xs font-medium uppercase tracking-[0.2em]"
                                >
                                    Buy ACT Token <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, loading }: { label: string; value: string; icon: React.ReactNode; loading: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-600">{label}</span>
                {loading ? (
                    <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" />
                ) : (
                    <span className="text-3xl font-light text-white tracking-tighter">{value}</span>
                )}
            </div>
        </motion.div>
    );
}

function StatBox({ label, value, icon, loading }: { label: string; value: string; icon: React.ReactNode; loading: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-600">{label}</span>
                {loading ? (
                    <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" />
                ) : (
                    <span className="text-3xl font-light text-white tracking-tighter">{value}</span>
                )}
            </div>
        </motion.div>
    );
}
