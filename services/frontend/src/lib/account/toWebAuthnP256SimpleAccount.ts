import {
	entryPoint08Abi,
	entryPoint08Address,
	getUserOperationHash,
	type SmartAccount,
	type SmartAccountImplementation,
	toSmartAccount,
	type UserOperation, type WebAuthnAccount,
	type WebAuthnAccunt
} from 'viem/account-abstraction';
import {
	type Address,
	type Assign,
	BaseError,
	decodeFunctionData,
	encodeAbiParameters,
	encodeFunctionData,
	type Hash,
	hashTypedData,
	type Hex,
	parseAbiParameters,
	type Prettify,
	type SignableMessage,
	toHex,
	type TypedData,
	type TypedDataDefinition,
	type UnionPartialBy
} from 'viem';
import { readContract } from 'viem/actions';
import {
	webAuthnP256SimpleAccountAbi,
	webAuthnP256SimpleAccountFactoryAbi
} from '@appliedblockchain/aa-demo-contracts';
import * as Signature from 'ox/Signature';
import { extractXYCoords } from '$lib/encoding';

export type WebAuthnP256SimpleAccountImplementation = Assign<
	SmartAccountImplementation<
		typeof entryPoint08Abi,
		'0.8',
		{
			abi: typeof webAuthnP256SimpleAccountAbi;
			factory: { abi: typeof webAuthnP256SimpleAccountFactoryAbi; address: Address };
		}
	>,
	{
		decodeCalls: NonNullable<SmartAccountImplementation['decodeCalls']>;
		sign: NonNullable<SmartAccountImplementation['sign']>;
	}
>;

export type ToWebAuthnP256SimpleAccountReturnType = Prettify<
	SmartAccount<WebAuthnP256SimpleAccountImplementation>
>;

type ToWebAuthnP256SimpleAccountInput = {
	client: WebAuthnP256SimpleAccountImplementation['client'];
	owner: WebAuthnAccount;
	address?: Address;
};

export const WebAuthnP256SimpleAccountFactoryAddress = '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707';

export const WebAuthnP256SimpleAccountFactory = {
	abi: webAuthnP256SimpleAccountFactoryAbi,
	address: WebAuthnP256SimpleAccountFactoryAddress
} as const;

const wrapHashInEIP712 = ({
	address,
	chainId,
	hash
}: {
	address: Address;
	chainId: number;
	hash: Hash;
}) =>
	hashTypedData({
		domain: {
			chainId,
			name: 'WebAuthn P256 Simple Account',
			verifyingContract: address,
			version: '1'
		},
		types: {
			HashedMessage: [
				{
					name: 'hash',
					type: 'bytes32'
				}
			]
		},
		primaryType: 'HashedMessage',
		message: {
			hash
		}
	});

export const toWebAuthnP256SimpleAccount = async ({
	client,
	owner,
	...parameters
}: ToWebAuthnP256SimpleAccountInput): Promise<ToWebAuthnP256SimpleAccountReturnType> => {
	let address = parameters.address;

	const { x, y } = extractXYCoords(owner.publicKey);

	return toSmartAccount({
		client,
		entryPoint: {
			version: '0.8',
			address: entryPoint08Address,
			abi: entryPoint08Abi
		},
		getAddress: async function (): Promise<Address> {
			address ??= await readContract(client, {
				...WebAuthnP256SimpleAccountFactory,
				functionName: 'getAddress',
				args: [x, y]
			});
			return address;
		},
		decodeCalls: async function (data: Hex) {
			const result = decodeFunctionData({
				abi: webAuthnP256SimpleAccountAbi,
				data
			});

			if (result.functionName === 'execute')
				return [{ to: result.args[0], value: result.args[1], data: result.args[2] }];
			if (result.functionName === 'executeBatch')
				return result.args[0].map((arg: any) => ({
					to: arg.target,
					value: arg.value,
					data: arg.data
				}));
			throw new BaseError(`unable to decode calls for "${result.functionName}"`);
		},
		encodeCalls: async function (
			calls: readonly {
				to: Hex;
				data?: Hex | undefined;
				value?: bigint | undefined;
			}[]
		): Promise<Hex> {
			if (calls.length === 1) {
				return encodeFunctionData({
					abi: webAuthnP256SimpleAccountAbi,
					functionName: 'execute',
					args: [calls[0].to, calls[0].value ?? 0n, calls[0].data ?? '0x']
				});
			}
			return encodeFunctionData({
				abi: webAuthnP256SimpleAccountAbi,
				functionName: 'executeBatch',
				args: [
					calls.map((call) => ({
						data: call.data ?? '0x',
						target: call.to,
						value: call.value ?? 0n
					}))
				]
			});
		},
		getFactoryArgs: async function (): Promise<{
			factory?: Address | undefined;
			factoryData?: Hex | undefined;
		}> {
			const factoryData = encodeFunctionData({
				abi: webAuthnP256SimpleAccountFactoryAbi,
				functionName: 'createAccount',
				args: [x, y]
			});
			return { factory: WebAuthnP256SimpleAccountFactory.address, factoryData };
		},
		getStubSignature: async function (): Promise<Hex> {
			return '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000';
		},
		signUserOperation: async function (
			parameters: UnionPartialBy<UserOperation, 'sender'> & {
				chainId?: number | undefined;
			}
		): Promise<Hex> {
			const { chainId = client.chain!.id, ...userOperation } = parameters;
			const hash = getUserOperationHash({
				chainId,
				entryPointAddress: entryPoint08Address,
				entryPointVersion: '0.8',
				userOperation: {
					...userOperation,
					sender: await this.getAddress()
				}
			});
			const result = await owner.sign({ hash });
			const { r, s } = Signature.fromHex(result.signature);
			const parms = {
				authenticatorData: result.webauthn.authenticatorData,
				clientDataJSON: result.webauthn.clientDataJSON,
				challengeIndex: BigInt(result.webauthn.challengeIndex),
				typeIndex: BigInt(result.webauthn.typeIndex),
				r: toHex(r, { size: 32 }),
				s: toHex(s, { size: 32 })
			};
			return encodeAbiParameters(
				parseAbiParameters([
					'WebAuthnAuth auth',
					'struct WebAuthnAuth {bytes authenticatorData; string clientDataJSON; uint256 challengeIndex; uint256 typeIndex; bytes32 r; bytes32 s;}'
				]),
				[parms]
			);
		},
		sign: async function ({ hash }) {
			return this.signMessage({
				message: wrapHashInEIP712({
					chainId: this.client.chain!.id,
					hash,
					address: await this.getAddress()
				})
			});
		},
		signMessage: async function ({ message }: { message: SignableMessage }): Promise<Hex> {
			const sig = await owner.signMessage({ message });
			return sig.signature;
		},
		signTypedData: async function <
			const typedData extends TypedData | Record<string, unknown>,
			primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData
		>(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
			const sig = await owner.signTypedData(parameters);
			return sig.signature;
		},
		extend: { abi: webAuthnP256SimpleAccountAbi, factory: WebAuthnP256SimpleAccountFactory }
	});
};
