import { simulateContract, writeContract } from 'viem/actions';
import { type Hex, type WalletClient } from 'viem';
import { WebAuthnP256SimpleAccountFactory } from '$lib/account/toWebAuthnP256SimpleAccount';
import { extractXYCoords } from '$lib/encoding';

export type SaveCredentialInput = {
	client: WalletClient;
	credential: {
		id: Hex;
		publicKey: Hex;
	};
};

export async function saveCredentialToFactory({ client, credential }: SaveCredentialInput) {
	const { x, y } = extractXYCoords(credential.publicKey);
	const request = {
		...WebAuthnP256SimpleAccountFactory,
		functionName: 'saveCredentialPublicKey' as const,
		args: [credential.id, x, y] as const,
		chain: client.chain,
		account: client.account!
	};
	await simulateContract(client, request);
	return writeContract(client, request);
}
