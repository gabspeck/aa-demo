import {Address, Chain, PublicActions, createClient, Hex, http, SignableMessage, TypedData, TypedDataDefinition, UnionPartialBy, PublicClient, readContract} from 'viem'
import {hardhat} from 'viem/chains'
import  {ignition} from 'hardhat'
import P256AccountFactoryModule from '../ignition/modules/P256AccountFactory'
import {bundlerActions, entryPoint07Abi, entryPoint07Address, toSmartAccount, UserOperation, UserOperationRequest} from 'viem/account-abstraction'

async function toCustomAccount({client}: {client: PublicClient}) {
	const {factory} = await ignition.deploy(P256AccountFactoryModule)
	const account = toSmartAccount({
		client,
		entryPoint: {
			abi: entryPoint07Abi,
			address: entryPoint07Address,
			version: '0.7'
		},
		getAddress: async function (): Promise<Address> {
			return readContract(client, {
				...factory,
				functionName: 'getAddress',
				args: []
			})
		},
		encodeCalls: function (calls: readonly { to: Hex; data?: Hex | undefined; value?: bigint | undefined }[]): Promise<Hex> {
			throw new Error('Function not implemented.')
		},
		getFactoryArgs: function (): Promise<{ factory?: Address | undefined; factoryData?: Hex | undefined }> {
			throw new Error('Function not implemented.')
		},
		getStubSignature: function (parameters?: UserOperationRequest | undefined): Promise<Hex> {
			throw new Error('Function not implemented.')
		},
		signMessage: function (parameters: { message: SignableMessage }): Promise<Hex> {
			throw new Error('Function not implemented.')
		},
		signTypedData: function <const typedData extends TypedData | Record<string,unknown>,primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData>(parameters: TypedDataDefinition<typedData,primaryType>): Promise<Hex> {
			throw new Error('Function not implemented.')
		},
		signUserOperation: function (parameters: UnionPartialBy<UserOperation,'sender'> & { chainId?: number | undefined }): Promise<Hex> {
			throw new Error('Function not implemented.')
		}
	})
	return account
}

async function main() {
	const client = createClient({chain: hardhat, transport: http("http://localhost:3000/rpc")}).extend(bundlerActions)
	const supportedEntryPoints = await client.getSupportedEntryPoints();
	// client.sendUserOperation({
	// 	account: module.account.address,
	// })
	const {factory} = await ignition.deploy(P256AccountFactoryModule)
	console.dir(factory.abi)
	console.log(factory.address)
	console.log({supportedEntryPoints})
}

void main()