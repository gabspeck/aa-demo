<div class="h-screen flex justify-center items-center p-4 dark bg-surface-800">
	<div class="card p-4 w-full max-w-sm shadow-xl min-h-[500px] flex flex-col bg-surface-900 text-white">
		<header class="card-header text-center p-4 border-b border-surface-700">
			<h2 class="h2 text-primary-500">Abstract Wallet</h2>
		</header>
		
		<form class="p-4 space-y-6 flex-1 flex flex-col justify-center" onsubmit={submit}>
			<label class="label">
				<span>Username</span>
				<input class="input bg-surface-800 border-surface-600 text-white" type="text" bind:value={username} placeholder="Enter your username" required disabled={loading} />
			</label>
			
			<div class="flex flex-col gap-4 pt-6">
				<button class="btn bg-primary-500 hover:bg-primary-600 text-white w-full" type="submit" value="login" disabled={loading}>
					{#if loading && lastAction === 'login'}
					<ProgressRing value={null} size="size-7"/>
					{:else}
						Login
					{/if}
				</button>
				<button class="btn bg-secondary-500 hover:bg-secondary-600 text-white w-full" type="submit" value="signup" disabled={loading}>
					{#if loading && lastAction === 'signup'}
						<ProgressRing value={null} size="size-7"/>
					{:else}
						Sign Up
					{/if}
				</button>
			</div>
			
			{#if error}
				<div class="alert bg-error-500 text-white mt-4">
					<span>{error}</span>
				</div>
			{/if}
		</form>
		
		<footer class="p-4 text-center text-sm text-surface-300">
			Secure blockchain authentication
		</footer>
	</div>
</div>

<script lang="ts">
	import { saveCredentialToFactory } from '$lib/accountFactory';
	import { createSignerClient } from '$lib/client';
	import { sessionState } from '$lib/state/session.svelte';
	import { toHex } from 'viem';
	import { toWebAuthnP256SimpleAccount } from '$lib/account';
	import { createWebAuthnCredential, toWebAuthnAccount } from 'viem/account-abstraction';
	import { ProgressRing } from '@skeletonlabs/skeleton-svelte';

	const client = createSignerClient();
	let error: string | null = $state(null);
	let username: string = $state('teste');
	let loading: boolean = $state(false);
	let lastAction: 'login' | 'signup' | null = $state(null);

	async function signup() {
		try {
			loading = true;
			lastAction = 'signup';
			error = null;
			const challenge = new Uint8Array(32);
			crypto.getRandomValues(challenge);
			const credential = await createWebAuthnCredential({ challenge, user: { name: username } });
			await saveCredentialToFactory({ client, credential: credential });
			await toWebAuthnP256SimpleAccount({
				client,
				owner: toWebAuthnAccount({ credential })
			});
			sessionState.credentialId = toHex(new Uint8Array(credential.raw.rawId));
		} catch (e: unknown) {
			console.error(e);
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function login() {
		try {
			loading = true;
			lastAction = 'login';
			error = null;
			// Implement login logic
			console.log('Login attempted with username:', username);
		} catch (e: unknown) {
			console.error(e);
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	const handlers: Record<string, () => Promise<void>> = {
		signup,
		login
	};

	async function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		await handlers[(e.submitter as HTMLButtonElement).value]();
	}
</script>
