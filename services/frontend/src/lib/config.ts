import { type Address, type Chain, type Hex, http, type Transport } from 'viem';
import { hardhat } from 'viem/chains';
import type { Abi } from 'ox/Abi';
import { sampleErc20Abi } from '@appliedblockchain/aa-demo-contracts';

export type Config = {
	evmRpc: {
		transport: Transport;
		chain: Chain;
	};
	bundlerRpc: {
		transport: Transport;
	};
	relayerKey: Hex;
	contracts: {
		erc20Token: {
			address: Address;
			abi: Abi;
		};
	};
};

export const config: Config = {
	evmRpc: { transport: http('http://localhost:8545'), chain: hardhat },
	bundlerRpc: { transport: http('http://localhost:3000/rpc') },
	relayerKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex,
	contracts: {
		erc20Token: { address: '0x0165878A594ca255338adfa4d48449f69242Eb8F', abi: sampleErc20Abi }
	}
};
