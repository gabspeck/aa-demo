<script lang="ts">
	import Login from '$lib/components/Login.svelte';
	import { getSession } from '$lib/state/session.svelte.js';
	import Wallet from '$lib/components/Wallet.svelte';
	import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
	import { onMount } from 'svelte';

	let loading: boolean = true

	onMount(() => {
		loading = false
	})

</script>
{#if loading}
	<ProgressRing value={null} classes="m-auto" />
{:else if getSession()}
	<Wallet />
{:else}
	<Login />
{/if}
