import {
	type BundlerClient,
	createBundlerClient as viemCreateBundlerClient,
	type SmartAccount
} from 'viem/account-abstraction';
import { type Account, type Chain, type Client, type Transport } from 'viem';
import { config } from '$lib/config';
import { createSignerClient } from '$lib/client';

export function createBundlerClient({
	client
}: {
	client?: Client<Transport, Chain, Account>;
}): BundlerClient<Transport, Chain, SmartAccount | undefined, typeof client> {
	if (!client) {
		client = createSignerClient();
	}
	return viemCreateBundlerClient({
		client,
		account: client.account,
		transport: config.bundlerRpc.transport
	});
}
