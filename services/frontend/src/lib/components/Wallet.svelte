<script>
	import { getSession, setSession } from '$lib/state/session.svelte.js';
	import { createBundlerClient, createReadOnlyClient, createSignerClient } from '$lib/client/index.js';
	import { writeContract } from 'viem/actions';
	import { config } from '$lib/config.js';
	import { estimateUserOperationGas, prepareUserOperation } from 'viem/account-abstraction';
	import { sendUserOp } from '$lib/userOp/index.js';

	const client = createReadOnlyClient();
	const bundlerClient = createBundlerClient();
	const session = getSession();

	const sendSampleTx = async () => {
		if (session) {
			await sendUserOp({bundlerClient, smartAccount: session.account})
		}
	};

</script>

{#if session}
	<main>
		<p><span class="font-bold">Chain ID:</span> {client.chain.id}</p>
		<p><span class="font-bold">Account address:</span> {session.account.address}</p>
		<div class="flex flex-col gap-1">
			<button class="btn preset-filled-primary-950-50" onclick={() => sendSampleTx()}>Send a sample transaction</button>
			<button class="btn preset-filled-primary-500" onclick={() => setSession(null)}>Log out</button>
		</div>
	</main>
{/if}
