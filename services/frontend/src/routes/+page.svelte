<main class="w-full h-full">
	<div class="m-5">
		<form onsubmit={saveCredential}>
			<h2>Create credential and save to registry</h2>
			<input class="form-input" name="username" placeholder="Enter a username" bind:value={username} required>
			<button type="submit" class="form-input">Create credential</button>
		</form>
		<form class="my-5" onsubmit={retrieveCredential}>
			<button type="submit" class="form-input">Retrieve Credential</button>
		</form>
		{#if credentialIdHex}
			<p>Credential ID: {credentialIdHex}</p>
			{#await xyPromise}
				<p>Retrieving public key coords...</p>
			{:then { x, y }}
				<p>x: {x}</p>
				<p>y: {y}</p>
			{:catch e}
				<p>Error retrieving public key: {e}</p>
			{/await}
			{#await accountPromise}
				<p>Retrieving account...</p>
			{:then account}
				{#await account?.getAddress()}
					<p>Retrieving address...</p>
				{:then address}
					<p>Computed address: {address}</p>
				{/await}
			{:catch e}
				<p>Error fetching address: {e}</p>
			{/await}
			<form onsubmit={sendUserOp}>
				<button class="form-input" type="submit">Send Mint Op</button>
			</form>
		{:else}
			<p>Create or retrieve a credential to begin</p>
		{/if}
	</div>
</main>


<script lang="ts">
	import { sampleErc20Abi, webAuthnP256SimpleAccountFactoryAbi } from '@appliedblockchain/aa-demo-contracts';
	import {
		createBundlerClient,
		createWebAuthnCredential,
		toWebAuthnAccount,
		type UserOperation
	} from 'viem/account-abstraction';
	import {
		concatHex,
		createWalletClient,
		encodeFunctionData,
		formatEther,
		getContract,
		type Hex,
		http,
		parseEther,
		publicActions,
		toHex
	} from 'viem';
	import { privateKeyToAccount } from 'viem/accounts';
	import { hardhat } from 'viem/chains';
	import { getBalance, getTransactionReceipt, sendTransaction } from 'viem/actions';
	import { toWebAuthnP256SimpleAccount } from '$lib/account/toWebAuthnP256SimpleAccount';
	import { saveCredentialToFactory } from '$lib/account';
	import { derived } from 'svelte/store';

	const rpcEndpoint = 'http://localhost:8545';
	const bundlerRpcEndpoint = 'http://localhost:3000/rpc';
	const relayerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
	const factoryAddress = '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707' as Hex;
	const erc20TokenAddress = '0x0165878A594ca255338adfa4d48449f69242Eb8F' as Hex;
	const relayerAccount = privateKeyToAccount(relayerKey);
	const client = createWalletClient({
		account: relayerAccount,
		chain: hardhat,
		transport: http(rpcEndpoint)
	}).extend(publicActions);
	const bundlerClient = createBundlerClient({ transport: http(bundlerRpcEndpoint), chain: hardhat });
	const factoryContract = getContract({
		client,
		abi: webAuthnP256SimpleAccountFactoryAbi,
		address: factoryAddress
	});
	const erc20TokenContract = getContract({
		client,
		abi: sampleErc20Abi,
		address: erc20TokenAddress
	});

	let username = $state('');
	let credentialIdBase64: string | null = $state(null);
	let credentialIdHex: Hex | null = $state(null);
	const xyPromise = $derived.by(async () => {
		if (credentialIdHex) {
			const [x, y] = await factoryContract.read.getCredentialPublicKey([credentialIdHex]);
			return { x, y };
		}
		return { x: null, y: null };
	});
	const accountPromise = $derived.by(async () => {
		const { x, y } = await xyPromise;
		if (credentialIdHex && x && y) {
			return toWebAuthnP256SimpleAccount({
				client,
				owner: toWebAuthnAccount({ credential: { id: credentialIdBase64, publicKey: concatHex([x, y]) } })
			});
		}
		return null;
	});

	async function saveCredential(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		// step 1: create credential
		const challenge = new Uint8Array(32);
		const credential = await createWebAuthnCredential({
			challenge: crypto.getRandomValues(challenge),
			user: {
				name: username
			}
		});
		const _credentialId = toHex(new Uint8Array(credential.raw.rawId));
		// step 2: save to factory so public key is retrievable from ID later
		await saveCredentialToFactory({
			client,
			credential: { id: _credentialId, publicKey: credential.publicKey }
		});
		credentialIdHex = _credentialId;
		credentialIdBase64 = credential.id;
	}


	async function sendUserOp(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const smartAccount = (await accountPromise)!;
		const address = smartAccount.address;
		const userOp = {
			account: smartAccount,
			callGasLimit: BigInt('0xFFFFFF'),
			verificationGasLimit: BigInt('0xFFFFFF'),
			calls: [{
				to: erc20TokenAddress,
				data: encodeFunctionData({
					abi: erc20TokenContract.abi,
					functionName: 'mint',
					args: [await smartAccount.getAddress(), 100n]
				})
			}]
		};
		const tx = await sendTransaction(client, { to: address, value: parseEther('10') });
		const receipt = await getTransactionReceipt(client, { hash: tx });
		console.log({ receipt });
		const scaBalance = await getBalance(client, { address });
		console.log({ balance: formatEther(scaBalance) });
		const estimatedGas = await bundlerClient.estimateUserOperationGas(userOp);
		const fixedEstimations = {
			...estimatedGas,
			preVerificationGas: estimatedGas.preVerificationGas * 2n,
			verificationGasLimit: estimatedGas.verificationGasLimit * 2n
		};
		const preparedOp: UserOperation = await bundlerClient.prepareUserOperation({
			...userOp, ...fixedEstimations,
			maxFeePerGas: parseEther('0.000001'),
			maxPriorityFeePerGas: parseEther('0.00001')
		}) as UserOperation;
		preparedOp.signature = await smartAccount.signUserOperation(preparedOp);
		const result = await bundlerClient.sendUserOperation(preparedOp);
	}

	async function retrieveCredential() {
		const challengeArray = new Uint8Array(32);
		credentialIdHex = toHex(new Uint8Array((await navigator.credentials.get({
			publicKey: {
				challenge: challengeArray
			}
		}) as PublicKeyCredential & {
			response: AuthenticatorAssertionResponse | AuthenticatorAttestationResponse
		}).rawId));
		if (!credentialIdHex) {
			throw new Error('No credential returned');
		}
	}

</script>
