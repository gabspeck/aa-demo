import { simulateContract, writeContract } from 'viem/actions';
import { type Account, type Chain, type Client, type Transport, toHex } from 'viem';
import { WebAuthnP256SimpleAccountFactory } from '$lib/account';
import type { P256Credential } from 'viem/account-abstraction';

export type SaveCredentialInput = {
	client: Client<Transport, Chain, Account>;
	credential: P256Credential;
};

export async function saveCredentialToFactory({ client, credential }: SaveCredentialInput) {
	const {
		publicKey: { x, y }
	} = credential;
	const request = {
		...WebAuthnP256SimpleAccountFactory,
		functionName: 'saveCredentialPublicKey' as const,
		args: [
			toHex(new Uint8Array(credential.raw.rawId)),
			toHex(x, { size: 32 }),
			toHex(y, { size: 32 })
		] as const
	};
	await simulateContract(client, request);
	return writeContract(client, request);
}
