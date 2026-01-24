"use client";

import * as React from "react";
import {
    RainbowKitProvider,
    darkTheme,
    connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
    metaMaskWallet,
    walletConnectWallet,
    rainbowWallet,
    coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = "2207521d9d101b8c3b3bba5de4153012";

const connectors = connectorsForWallets(
    [
        {
            groupName: "Recommended",
            wallets: [
                (options: any) => {
                    const mm = metaMaskWallet({ ...options, projectId });
                    return {
                        ...mm,
                        mobile: {
                            ...mm.mobile,
                            getUri: (uri: string) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
                        },
                    };
                },
                (options: any) => walletConnectWallet({ ...options, projectId }),
                (options: any) => rainbowWallet({ ...options, projectId }),
                (options: any) => coinbaseWallet({ ...options, appName: "AnthropoCity" }),
            ],
        },
    ],
    {
        appName: "AnthropoCity Publisher Verification",
        projectId,
    }
);

const config = createConfig({
    connectors,
    chains: [arbitrum],
    transports: {
        [arbitrum.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()} modalSize="compact">
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
