# Identity & Status Control App - Setup Guide

## Overview
This is the permission-gated control app that manages user identity, status, and ACT token wallet verification for the Whop platform.

## Architecture

### User States
- **Visitor**: No purchase, cannot access app
- **Member**: Has purchase, can access app, not verified
- **Publisher**: Has purchase, verified ACT token ownership, has access to Publisher apps

### Key Components

1. **Client Page**: `/app/control/page.tsx`
   - Main UI component
   - Wallet connection and verification flow
   - Identity display (read-only)

2. **API Routes**:
   - `/api/user`: Get user identity and status
   - `/api/verify-wallet`: Verify wallet signature and ACT balance, grant Publisher access

3. **Library Functions**:
   - `lib/whop-api.ts`: Whop API integration (user data, metadata storage, access granting)
   - `lib/wallet-verification.ts`: Wallet signature and ACT token balance verification
   - `lib/types.ts`: TypeScript type definitions

## Configuration Required

### 1. Whop API Integration
Update `lib/whop-api.ts` with actual Whop API endpoints:

- Replace `getWhopUserData()` with actual Whop API call
- Replace `storeWhopMetadata()` with Whop Company Metadata API
- Replace `grantPublisherAccess()` with Whop App Access API

Whop API endpoints should use:
- Authentication: Bearer token in Authorization header
- Base URL: `https://api.whop.com/api/v2/`

### 2. ACT Token Configuration
Update `lib/wallet-verification.ts`:

- Set `ACT_TOKEN_ADDRESS` to the actual ACT token contract address on Arbitrum
- Adjust `MIN_ACT_BALANCE` to the required minimum (currently 1 token)
- Verify token decimals (currently assumes 18)

### 3. Whop Authentication
Update authentication in:
- `app/api/user/route.ts`: Get Whop token from actual auth system
- `app/api/verify-wallet/route.ts`: Get Whop token from actual auth system
- `app/control/page.tsx`: Replace `"mock_token"` with actual token retrieval

Whop apps typically receive authentication via:
- Headers: `x-whop-token` or `Authorization: Bearer <token>`
- Cookies: `whop_token`
- Query params (less secure): `whop_token`

### 4. Environment Variables (Optional)
Create `.env.local`:
```
NEXT_PUBLIC_ACT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_MIN_ACT_BALANCE=1
WHOP_API_BASE_URL=https://api.whop.com/api/v2
```

## Features Implemented

✅ Permission gating (only purchasers can access)
✅ Identity display (username, user ID, status, verification)
✅ ACT wallet verification flow
✅ Server-side signature verification
✅ ACT token balance check on Arbitrum
✅ Metadata storage via Whop API
✅ Publisher access granting
✅ Dynamic UI based on user status
✅ Rules and eligibility display
✅ Error handling and user feedback

## Testing

1. **As Visitor**: Should see "Access denied" message
2. **As Member**: Should see verification button and be able to verify wallet
3. **As Publisher**: Should see verified status and no verification button

## Network Requirements

- Wallet must be connected to Arbitrum network
- User must have sufficient ACT tokens in wallet
- Signature must be valid

## Security Notes

- All wallet verification is done server-side
- Signature verification prevents wallet spoofing
- ACT balance check ensures token ownership
- Whop metadata is the single source of truth
- Access is binary (no partial states)

