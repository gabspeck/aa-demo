<h1>Passkey demo</h1>

<button class="border p-2 bg-gray-200 active:bg-gray-400" onclick={getCredential}>Get credential</button>

{#if cred}
	<div>
		<p>Credential ID: {cred.id}</p>
		<p>Signature length: {cred.response.signature.byteLength} bytes</p>
	</div>
{/if}

<script lang="ts">


	import {
		type Address,
		type Call,
		createClient,
		type Hash,
		type Hex,
		http,
		type SignableMessage,
		type TypedDataDefinition, type UnionPartialBy
	} from 'viem';
	import { hardhat } from 'viem/chains';
	import {
		bundlerActions, createWebAuthnCredential,
		toSmartAccount,
		type UserOperation,
		type UserOperationRequest
	} from 'viem/account-abstraction';
	import { readContract } from 'viem/actions';

	type PublicKeyCredentialAssertion = PublicKeyCredential & { response: AuthenticatorAssertionResponse }

	let cred: PublicKeyCredentialAssertion | null = null;

	async function connect({credentialId}: {credentialId: ArrayBuffer}) {

		const factoryAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
		const factoryAbi = [
			{
				inputs: [
					{
						internalType: 'contract IEntryPoint',
						name: '_entryPoint',
						type: 'address'
					}
				],
				stateMutability: 'nonpayable',
				type: 'constructor'
			},
			{
				inputs: [],
				name: 'accountImplementation',
				outputs: [
					{
						internalType: 'contract P256Account',
						name: '',
						type: 'address'
					}
				],
				stateMutability: 'view',
				type: 'function'
			},
			{
				inputs: [
					{ internalType: 'bytes', name: 'cid', type: 'bytes' },
					{ internalType: 'bytes32', name: 'qx', type: 'bytes32' },
					{ internalType: 'bytes32', name: 'qy', type: 'bytes32' },
					{ internalType: 'uint256', name: 'salt', type: 'uint256' }
				],
				name: 'createAccount',
				outputs: [
					{
						internalType: 'contract P256Account',
						name: 'ret',
						type: 'address'
					}
				],
				stateMutability: 'nonpayable',
				type: 'function'
			},
			{
				inputs: [
					{ internalType: 'bytes', name: 'cid', type: 'bytes' },
					{ internalType: 'bytes32', name: 'qx', type: 'bytes32' },
					{ internalType: 'bytes32', name: 'qy', type: 'bytes32' },
					{ internalType: 'uint256', name: 'salt', type: 'uint256' }
				],
				name: 'getAddress',
				outputs: [ { internalType: 'address', name: '', type: 'address' } ],
				stateMutability: 'view',
				type: 'function'
			},
			{
				inputs: [],
				name: 'senderCreator',
				outputs: [
					{
						internalType: 'contract ISenderCreator',
						name: '',
						type: 'address'
					}
				],
				stateMutability: 'view',
				type: 'function'
			}
		];
		const entryPointV07Address = '0x7192B26e73f6D7BA545693a9B14A2DE9fa35254c'
		const entryPointV08Abi = []
		const client = createClient({ chain: hardhat, transport: http('http://localhost:3000/rpc') }).extend(bundlerActions);
		await toSmartAccount({
			client,
			decodeCalls(data: Hex): Promise<readonly Call[]> {
				return Promise.resolve([]);
			},
			encodeCalls(calls: readonly Call[]): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			entryPoint: {
				address: entryPointV08Address,
				abi: entryPointV08Abi,
				version: '0.8' as '0.7'
			},
			extend: undefined,
			getAddress(): Promise<Address> {
				return readContract(client, {
					abi: factoryAbi,
					functionName: 'getAddress',
					parameters: [credentialId]
				})
			},
			getFactoryArgs(): Promise<{ factory?: Address | undefined; factoryData?: Hex | undefined }> {
				return Promise.resolve({});
			},
			getNonce(parameters: { key?: bigint | undefined } | undefined): Promise<bigint> {
				return Promise.resolve(0n);
			},
			getStubSignature(parameters: UserOperationRequest | undefined): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			nonceKeyManager: undefined,
			sign(parameters: { hash: Hash }): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			signMessage(parameters: { message: SignableMessage }): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			signTypedData<typedData, primaryType>(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			signUserOperation(parameters: UnionPartialBy<UserOperation, "sender"> & {
				chainId?: number | undefined
			}): Promise<Hex> {
				return Promise.resolve(undefined);
			},
			userOperation: {}
		})
	}

	async function getCredential() {
		const challengeArray = new Uint8Array(32);
		const cred = createWebAuthnCredential({name: "Demo"})
		console.log({cred})
	}
</script>
