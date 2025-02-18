import BN from "bn.js";
import { Cell, beginCell, Address } from "ton";
import { beginMessage } from "./helpers";

/*
  This file defines a set of functions that encode various messages and data
  structures for a liquidity pool smart contract. Each function ultimately returns
  a Cell – a building block for data on the TON blockchain – which can be transmitted
  or stored.

  The functions include:
  - data:        Encodes initial pool configuration data.
  - setFees:     Encodes a message to update fee parameters.
  - burnTokensNotification: Encodes a message notifying that LP tokens have been burned.
  - collectFees: Encodes a message to initiate fee collection.
  - resetGas:    Encodes a message to reset gas tracking.
  - swap:        Encodes a swap operation message.
  - provideLiquidity: Encodes a liquidity provision request.
  - getPoolData: Encodes a basic getter message to retrieve pool data.
  - getExpectedOutputs: Encodes a message to compute expected swap outputs.
  - getCachedLPByAddress: Encodes a getter message for querying cached LP account data.
*/

/**
 * Constructs the initial data cell for the pool.
 *
 * This function encodes the pool's parameters into a Cell. The encoded data
 * includes addresses, fee parameters, collected protocol fees, token reserves,
 * wallet addresses and additional cells holding contract code (for LP wallet and account).
 *
 * @param params - Pool configuration data.
 * @returns A Cell containing the encoded pool configuration.
 */
export function data(params: {
  routerAddress: Address;
  lpFee: BN;
  protocolFee: BN;
  refFee: BN;
  protocolFeesAddress: Address;
  collectedTokenAProtocolFees: BN;
  collectedTokenBProtocolFees: BN;
  reserve0: BN;
  reserve1: BN;
  wallet0: Address;
  wallet1: Address;
  supplyLP: BN;
  LPWalletCode: Cell;
  LPAccountCode: Cell;
}): Cell {
  return beginCell()
    // Store the pool's router address (used to delegate certain pool operations).
    .storeAddress(params.routerAddress)
    // Store fee parameters:
    // - lpFee: Fee for liquidity providers.
    // - protocolFee: The fee collected by the protocol.
    // - refFee: The referral fee.
    .storeUint(params.lpFee, 8)
    .storeUint(params.protocolFee, 8)
    .storeUint(params.refFee, 8)
    // Store token wallet addresses.
    .storeAddress(params.wallet0)
    .storeAddress(params.wallet1)
    // Store the current total LP token supply.
    .storeCoins(params.supplyLP)
    // Store a reference cell containing additional fees and reserves data:
    //   - Collected protocol fees for both tokens.
    //   - Protocol fees payout address.
    //   - Reserves of tokens 0 and 1.
    .storeRef(
      beginCell()
        .storeCoins(params.collectedTokenAProtocolFees)
        .storeCoins(params.collectedTokenBProtocolFees)
        .storeAddress(params.protocolFeesAddress)
        .storeCoins(params.reserve0)
        .storeCoins(params.reserve1)
        .endCell()
    )
    // Store reference cells for LP wallet and LP account contract code.
    .storeRef(params.LPWalletCode)
    .storeRef(params.LPAccountCode)
    .endCell();
}

/**
 * Encodes a message to update pool fee parameters.
 *
 * This function packages new fee values (for liquidity providers, protocol, and referrals)
 * along with the address that receives the protocol fees into a Cell.
 *
 * @param params - Object containing the new fee values and the new protocol fee address.
 * @returns A Cell representing the fee update message.
 */
export function setFees(params: { newLPFee: BN; newProtocolFees: BN; newRefFee: BN; newProtocolFeeAddress: Address }): Cell {
  return beginMessage({ op: new BN(0x355423e5) })
    // Encode each new fee (8 bits each).
    .storeUint(params.newLPFee, 8)
    .storeUint(params.newProtocolFees, 8)
    .storeUint(params.newRefFee, 8)
    // Store the updated protocol fee address.
    .storeAddress(params.newProtocolFeeAddress)
    .endCell();
}

/**
 * Encodes a notification message which informs the pool of burned LP tokens.
 *
 * This message is typically sent by the LP wallet after burning LP tokens in order to release liquidity.
 * The encoded cell includes the amount of LP tokens being redeemed, the user's address,
 * and an optional response address.
 *
 * @param params - Information about the burn operation.
 * @returns A Cell remote message representing the burn notification.
 */
export function burnTokensNotification(params: { jettonAmount: BN; fromAddress: Address; responseAddress: Address | null }): Cell {
  return beginMessage({ op: new BN(0x7bdd97de) })
    // Encode the amount of tokens being burned.
    .storeCoins(params.jettonAmount)
    // Store the address from which the burn is initiated.
    .storeAddress(params.fromAddress)
    // Store an optional response address for callback if needed.
    .storeAddress(params.responseAddress)
    .endCell();
}

/**
 * Encodes a simple message instructing the pool to collect protocol fees.
 *
 * This function does not require additional parameters. After encoding the operation code,
 * the message is finalized as a Cell.
 *
 * @returns A Cell with the collect fees operation.
 */
export function collectFees(): Cell {
  return beginMessage({ op: new BN(0x1fcb7d3d) }).endCell();
}

/**
 * Encodes a message to reset gas usage tracking in the pool contract.
 *
 * This message does not carry additional data beyond the operation code.
 *
 * @returns A Cell encoding the reset gas operation.
 */
export function resetGas(): Cell {
  return beginMessage({ op: new BN(0x42a0fb43) }).endCell();
}

/**
 * Encodes a swap operation message.
 *
 * The swap message is used to exchange one type of token for another.
 * It includes the source address, token wallet address, the amount being swapped,
 * the recipient address, and a minimum expected output amount. It can also include
 * referral information if applicable.
 *
 * @param params - Details for the swap operation.
 * @returns A Cell encoding the swap operation.
 */
export function swap(params: { fromAddress: Address; tokenWallet: Address; jettonAmount: BN; toAddress: Address; minOutput: BN; hasRef?: boolean; refAddress?: Address; }): Cell {
  return beginMessage({ op: new BN(0x25938561) })
    // Encode the address initiating the swap.
    .storeAddress(params.fromAddress)
    // Encode the token wallet address that holds the tokens to be swapped.
    .storeAddress(params.tokenWallet)
    // Encode the jetton (token) amount provided for the swap.
    .storeCoins(params.jettonAmount)
    // Encode the minimum accepted output to ensure a fair swap.
    .storeCoins(params.minOutput)
    // Encode a boolean flag indicating whether referral data is included.
    .storeBit(!!params.hasRef)
    // Store a fixed flag (true) to indicate the swap message is well-formed.
    .storeBit(true)
    // Store additional swap-related data in a reference cell:
    //   - The source address.
    //   - The referral address if provided; if not, null.
    .storeRef(beginCell()
      .storeAddress(params.fromAddress)
      .storeAddress(params.refAddress || null)
      .endCell())
    .endCell();
}

/**
 * Encodes a message for providing liquidity to the pool.
 *
 * When a user contributes liquidity, they supply amounts for two tokens.
 * This function encodes their contribution along with the minimum LP token amount expected.
 *
 * @param params - Details about the liquidity provision request.
 * @returns A Cell encoding the liquidity provision operation.
 */
export function provideLiquidity(params: { fromAddress: Address; jettonAmount0: BN; jettonAmount1: BN; minLPOut: BN }): Cell {
  return beginMessage({ op: new BN(0xfcf9e58f) })
    // The user's address that is adding liquidity.
    .storeAddress(params.fromAddress)
    // The minimum LP tokens expected.
    .storeCoins(params.minLPOut)
    // The amount of token0 and token1 being contributed.
    .storeCoins(params.jettonAmount0)
    .storeCoins(params.jettonAmount1)
    .endCell();
}

/**
 * Encodes a getter message to retrieve pool data.
 *
 * This message is used to request the current state of the pool, which includes
 * factors like reserves, liquidity supply, fee accumulations, etc.
 *
 * @returns A Cell encoding the get pool data operation.
 */
export function getPoolData(): Cell {
  return beginMessage({ op: new BN(0x43c034e6) })
    .endCell();
}

/**
 * Encodes a message to calculate the expected outputs of a swap.
 *
 * This is used to query how many tokens a user would receive for a given input amount.
 * It includes the jetton amount used in the swap, and the token wallet address being swapped.
 *
 * @param params - Swap parameters including jetton amount and token wallet.
 * @returns A Cell encoding the expected outputs query.
 */
export function getExpectedOutputs(params: { jettonAmount: BN, tokenSent: Address }): Cell {
  return beginMessage({ op: new BN(0xed4d8b67) })
    // Encode the jetton amount provided for the swap.
    .storeCoins(params.jettonAmount)
    // Encode the token wallet address related to the swap.
    .storeAddress(params.tokenSent)
    .endCell();
}

/**
 * Encodes a message to query cached LP account data for a specified user address.
 *
 * This getter message is used to retrieve information about a user's liquidity provider
 * account from the pool contract.
 *
 * @param params - An object containing the user's address.
 * @returns A Cell encoding the cached LP lookup message.
 */
export function getCachedLPByAddress(params: { userAddress: Address }): Cell {
  return beginMessage({ op: new BN(0x0c0671db) })
    // Store the user's address for which the LP account is looked up.
    .storeAddress(params.userAddress)
    .endCell();
}