import type { Chain, Client, Hex, Transport } from 'viem';
import { readContract } from 'viem/actions';
import { WebAuthnP256SimpleAccountFactory } from '$lib/account';

export async function getPublicKeyByCredentialId({
	client,
	credentialId
}: {
	client: Client<Transport, Chain>;
	credentialId: Hex;
}) {
	return readContract(client, {
		...WebAuthnP256SimpleAccountFactory,
		functionName: 'getCredentialPublicKey',
		args: [credentialId]
	});
}
