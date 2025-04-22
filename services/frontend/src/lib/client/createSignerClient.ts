import {
	type Account,
	type Chain, type Client,
	createWalletClient,
	publicActions,
	type Transport,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '$lib/config';

export function createSignerClient(): Client<Transport, Chain, Account> {
	return createWalletClient({
		account: privateKeyToAccount(config.relayerKey),
		chain: config.evmRpc.chain,
		transport: config.evmRpc.transport
	}).extend(publicActions);
}
