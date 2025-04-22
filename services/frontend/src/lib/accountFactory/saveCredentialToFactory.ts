import { simulateContract, writeContract } from 'viem/actions';
import { type Account, type Chain, type Client, type Transport, toHex } from 'viem';
import { WebAuthnP256SimpleAccountFactory } from '$lib/account';
import type { P256Credential } from 'viem/account-abstraction';
import { extractXYCoords } from '$lib/encoding';

export type SaveCredentialInput = {
	client: Client<Transport, Chain, Account>;
	credential: P256Credential;
};

export async function saveCredentialToFactory({ client, credential }: SaveCredentialInput) {
	const { publicKey } = credential;
	const { x, y } = extractXYCoords(publicKey);
	const request = {
		...WebAuthnP256SimpleAccountFactory,
		functionName: 'saveCredentialPublicKey' as const,
		args: [toHex(new Uint8Array(credential.raw.rawId)), x, y] as const
	};
	await simulateContract(client, request);
	return writeContract(client, request);
}
