<script>
	import { getSession, setSession } from '$lib/state/session.svelte.js';
	import { createReadOnlyClient } from '$lib/client/index.js';

	const client = createReadOnlyClient();
	const session = getSession();

</script>

{#if session}
	<main>
		<p><span class="font-bold">Chain ID:</span> {client.chain.id}</p>
		<p><span class="font-bold">Account address:</span> {session.account.address}</p>
	</main>
	<button class="btn preset-filled-primary-500" onclick={() => setSession(null)}>Log out</button>
{/if}
