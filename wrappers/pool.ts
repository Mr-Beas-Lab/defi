import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Dictionary,
} from '@ton/core';

// Operation codes matching the contract
export const PoolOpcodes = {
    mint_tokens: 100,
    burn_tokens: 101,
    add_liquidity: 102,
    remove_liquidity: 103,
    update_reserves: 104,
    set_lock_status: 105,
    initialize_contract: 106,
    add_authorized: 107,
    remove_authorized: 108,
} as const;

export type PoolConfig = {
    owner_address: Address;
    token_a_address: Address;
    token_b_address: Address;
    lp_token_address: Address;
    min_liquidity: bigint;
};

export function poolConfigToCell(config: PoolConfig): Cell {
    return beginCell()
        .storeRef(beginCell().storeAddress(config.owner_address).endCell())
        .storeRef(beginCell().storeAddress(config.token_a_address).endCell())
        .storeRef(beginCell().storeAddress(config.token_b_address).endCell())
        .storeUint(0, 128) // reserve_a
        .storeUint(0, 128) // reserve_b
        .storeUint(0, 128) // total_supply
        .storeUint(config.min_liquidity, 128)
        .storeUint(0, 1) // is_locked
        .storeDict(Dictionary.empty()) // authorized_addresses
        .storeRef(beginCell().storeAddress(config.lp_token_address).endCell())
        .endCell();
}

export default class Pool implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new Pool(address);
    }

    static createFromConfig(config: PoolConfig, code: Cell, workchain = 0) {
        const data = poolConfigToCell(config);
        const init = { code, data };
        return new Pool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, config: PoolConfig, value: bigint) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.initialize_contract, 32)
            .storeRef(beginCell().storeAddress(config.owner_address).endCell())  // owner
            .storeRef(beginCell().storeAddress(config.token_a_address).endCell())  // token_a
            .storeRef(beginCell().storeAddress(config.token_b_address).endCell())  // token_b
            .storeRef(beginCell().storeAddress(config.lp_token_address).endCell())  // lp_token
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendAddLiquidity(
        provider: ContractProvider,
        via: Sender,
        opts: {
            amount_a: bigint;
            amount_b: bigint;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.add_liquidity, 32)
            .storeUint(opts.amount_a, 128)
            .storeUint(opts.amount_b, 128)
            .storeAddress(via.address!)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendRemoveLiquidity(
        provider: ContractProvider,
        via: Sender,
        opts: {
            liquidity_amount: bigint;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.remove_liquidity, 32)
            .storeUint(opts.liquidity_amount, 128)
            .storeAddress(via.address!)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendUpdateReserves(
        provider: ContractProvider,
        via: Sender,
        opts: {
            new_reserve_a: bigint;
            new_reserve_b: bigint;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.update_reserves, 32)
            .storeUint(opts.new_reserve_a, 128)
            .storeUint(opts.new_reserve_b, 128)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendAddAuthorized(
        provider: ContractProvider,
        via: Sender,
        opts: {
            address: Address;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.add_authorized, 32)
            .storeAddress(opts.address)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendRemoveAuthorized(
        provider: ContractProvider,
        via: Sender,
        opts: {
            address: Address;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.remove_authorized, 32)
            .storeAddress(opts.address)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    async sendSetLockStatus(
        provider: ContractProvider,
        via: Sender,
        opts: {
            status: boolean;
            value: bigint;
        }
    ) {
        const msgBody = beginCell()
            .storeUint(PoolOpcodes.set_lock_status, 32)
            .storeUint(opts.status ? 1 : 0, 1)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msgBody
        });
    }

    // Get Methods
    async getReserves(provider: ContractProvider) {
        const { stack } = await provider.get('get_reserves', []);
        return {
            reserve_a: stack.readBigNumber(),
            reserve_b: stack.readBigNumber(),
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        const { stack } = await provider.get('get_total_supply', []);
        return stack.readBigNumber();
    }
}
