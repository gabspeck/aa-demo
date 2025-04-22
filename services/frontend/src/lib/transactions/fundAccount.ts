import { getBalance, getTransactionReceipt } from 'viem/actions';
import {
	type Account,
	type Address,
	type Chain,
	formatEther,
	type Transport,
	type WalletClient
} from 'viem';

export async function fundAccount({
	client,
	address,
	value
}: {
	value: bigint;
	client: WalletClient<Transport, Chain, Account>;
	address: Address;
}) {
	const tx = await client.sendTransaction({ to: address, value });
	const receipt = await getTransactionReceipt(client, { hash: tx });
	console.log({ receipt });
	const scaBalance = await getBalance(client, { address });
	console.log({ balance: formatEther(scaBalance) });
}
