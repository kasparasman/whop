// User states - only these three states exist
export type UserStatus = "Visitor" | "Member" | "Publisher";

export interface UserIdentity {
  username: string;
  userId: string;
  status: UserStatus;
  actVerification: {
    verified: boolean;
    walletAddress?: string;
    network?: "Arbitrum";
    token?: "ACT (ERC-20)";
  };
}

export interface WalletVerificationResult {
  success: boolean;
  message: string;
  walletAddress?: string;
  error?: string;
}

export interface WhopMetadata {
  wallet_verified: string;
  wallet_address: string;
  act_balance_verified: string;
  verification_timestamp: string;
}

