import { createPublicClient } from 'viem';
import { config } from '$lib/config';

export function createReadOnlyClient() {
	return createPublicClient({
		...config.evmRpc
	});
}
