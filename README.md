# TON DEX Pool Contract Documentation

## Overview
This smart contract implements an automated market maker (AMM) liquidity pool for token exchange on TON blockchain. The contract manages token pairs, handles liquidity provision/removal, and executes token swaps with a multi-tiered fee structure.

## Fee Structure
The pool implements a sophisticated three-tier fee system:

### 1. LP Provider Fee (`storage::lp_fee`)
- Collected from each swap and distributed to liquidity providers
- Fee range: 0-200 basis points (0-2%)
- Stored in `storage::collected_token0_provider_fee` and `storage::collected_token1_provider_fee`
- Distributed to `storage::provider_fee_address`

### 2. Protocol Fee (`storage::protocol_fee`)
- Additional fee collected for protocol governance/development
- Fee range: 0-200 basis points (0-2%)
- Stored in `storage::collected_token0_protocol_fee` and `storage::collected_token1_protocol_fee`
- Distributed to `storage::protocol_fee_address`

### 3. Referral Fee (`storage::ref_fee`)
- Optional fee for referral rewards
- Only applied when a referral address is provided
- Fee range: 0-200 basis points (0-2%)
- Distributed immediately during swap execution

### Fee Calculation Logic
```
get_amount_out(has_ref, amount, reserve_in, reserve_out):
1. Calculate base output using constant product formula:
   base_out = (amount * reserve_out) / (reserve_in + amount)

2. Calculate individual fees:
   provider_fee = ceil(base_out * lp_fee / FEE_DIVIDER)
   protocol_fee = ceil(base_out * protocol_fee / FEE_DIVIDER)
   ref_fee = has_ref ? ceil(base_out * ref_fee / FEE_DIVIDER) : 0

3. Calculate final output:
   final_out = base_out - provider_fee - protocol_fee - ref_fee
```

### Fee Collection
- Fees can be collected when accumulated amounts exceed `REQUIRED_MIN_COLLECT_FEES` (1,000,000 units)
- Collection triggers distribution to fee recipients
- Small reward (0.1%) given to the collector who initiates fee collection
- Fee collection requires adequate gas (>1 TON remaining)

## Core Parameters

### Constants
```
FEE_DIVIDER = 10000           // Fee scaling factor
MIN_FEE = 0                   // Minimum fee (0%)
MAX_FEE = 200                 // Maximum fee (2%)
REQUIRED_MIN_COLLECT_FEES = 1000000  // Minimum collectible fees
REQUIRED_TON_RESERVE = 10000000      // Minimum TON reserve
MAX_COINS = 2^120 - 1         // Maximum token amount
```

### Storage Variables
```
storage::lp_fee               // LP provider fee percentage
storage::protocol_fee         // Protocol fee percentage
storage::ref_fee             // Referral fee percentage
storage::protocol_fee_address // Protocol fee recipient
storage::provider_fee_address // LP fee recipient
storage::reserve0            // Token0 reserve
storage::reserve1            // Token1 reserve
storage::total_supply_lp     // Total LP tokens
```

## Key Operations

### Swaps
1. Verify sufficient liquidity exists
2. Calculate output amount and fees
3. Update reserves and fee accumulators
4. Distribute referral fee if applicable
5. Send tokens to recipient

### Fee Collection
1. Verify minimum fee thresholds
2. Calculate collector reward (0.1%)
3. Distribute protocol fees
4. Distribute LP provider fees
5. Reset fee accumulators

### Fee Updates
The `set_fees` operation allows authorized updates to:
- LP provider fee rate
- Protocol fee rate
- Referral fee rate
- Fee recipient addresses

## Safety Features

### Fee Limits
- All fees must be between 0-200 basis points
- Total fees cannot prevent minimum output requirements
- Fee collection requires minimum accumulated amounts

### Reserve Protection
- Minimum TON reserve requirement
- Maximum token amount limits
- Minimum liquidity requirements
- K-value (constant product) protection

### Gas Management
- Required gas checks for operations
- Gas distribution for multi-message operations
- Gas reserve for contract survival

## Error Codes
```
NO_LIQUIDITY = 80        // Insufficient pool liquidity
ZERO_OUTPUT = 81         // Zero output amount
INVALID_CALLER = 82      // Unauthorized caller
INSUFFICIENT_GAS = 83    // Not enough gas
FEE_OUT_RANGE = 85       // Fee outside allowed range
INVALID_TOKEN = 86       // Invalid token address
LOW_AMOUNT = 87          // Amount too low
LOW_LIQUIDITY = 88       // Liquidity too low
WRONG_K = 89            // Constant product invariant violated
MATH_ERROR = 90         // Mathematical error
INVALID_RECIPIENT = 91   // Invalid fee recipient
```