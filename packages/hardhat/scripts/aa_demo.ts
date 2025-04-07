import {
  Address,
  Chain,
  PublicActions,
  createClient,
  Hex,
  http,
  SignableMessage,
  TypedData,
  TypedDataDefinition,
  UnionPartialBy,
  PublicClient,
  readContract,
  encodeFunctionData,
} from "viem";
import { hardhat } from "viem/chains";
import { ignition } from "hardhat";
import P256AccountFactoryModule from "../ignition/modules/P256AccountFactory";
import {
  bundlerActions,
  entryPoint07Abi,
  entryPoint07Address,
  toSmartAccount,
  UserOperation,
  UserOperationRequest,
} from "viem/account-abstraction";

async function toCustomAccount({
  client,
  qx,
  qy,
}: {
  client: PublicClient;
  credentialId: Uint8Array;
  qx: Hex;
  qy: Hex;
}) {
  const { factory } = await ignition.deploy(P256AccountFactoryModule);
  const account = toSmartAccount({
    client,
    entryPoint: {
      abi: entryPoint07Abi,
      address: entryPoint07Address,
      version: "0.7",
    },
    getAddress: async function (): Promise<Address> {
      return readContract(client, {
        ...factory,
        functionName: "getAddress",
        args: [qx, qy],
      });
    },
    encodeCalls: function (
      calls: readonly {
        to: Hex;
        data?: Hex | undefined;
        value?: bigint | undefined;
      }[]
    ): Promise<Hex> {
      throw new Error("Function not implemented.");
    },
    getFactoryArgs: async function (): Promise<{
      factory?: Address | undefined;
      factoryData?: Hex | undefined;
    }> {
      return {
        factory: factory.address,
        factoryData: encodeFunctionData({
          abi: factory.abi,
          functionName: "createAccount",
          args: [qx, qy],
        }),
      };
    },
    getStubSignature: async function (): Promise<Hex> {
        return '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000'
    },
    signMessage: function (parameters: {
      message: SignableMessage;
    }): Promise<Hex> {
      throw new Error("Function not implemented.");
    },
    signTypedData: function <
      const typedData extends TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
      throw new Error("Function not implemented.");
    },
    signUserOperation: function (
      parameters: UnionPartialBy<UserOperation, "sender"> & {
        chainId?: number | undefined;
      }
    ): Promise<Hex> {
      throw new Error("Function not implemented.");
    },
  });
  return account;
}

async function main() {
  const client = createClient({
    chain: hardhat,
    transport: http("http://localhost:3000/rpc"),
  }).extend(bundlerActions);
  const supportedEntryPoints = await client.getSupportedEntryPoints();
  // client.sendUserOperation({
  // 	account: module.account.address,
  // })
  const { factory } = await ignition.deploy(P256AccountFactoryModule);
  console.dir(factory.abi);
  console.log(factory.address);
  console.log({ supportedEntryPoints });
}

void main();
