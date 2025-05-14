<header class="card-header text-center p-4 border-b border-surface-700">
	<h2 class="h2">Abstract Wallet</h2>
</header>


<form class="p-4 space-y-6 flex-1 flex flex-col justify-center" onsubmit={submit}>
	<div class="flex flex-col gap-4 pt-6">
		<button class="btn preset-filled-primary-500 primary w-full" type="submit" value="login"
						disabled={loading}>
			{#if loading && lastAction === 'login'}
				<ProgressRing value={null} size="size-7" />
			{:else}
				Login
			{/if}
		</button>
	</div>
</form>

<form class="p-4 space-y-6 flex-1 flex flex-col justify-center" onsubmit={submit}>
	<label class="label">
		<input class="input" type="text" bind:value={username}
					 placeholder="Enter your username" required disabled={loading} />
		<button class="btn preset-filled-secondary-500 w-full" type="submit" value="signup"
						disabled={loading}>
			{#if loading && lastAction === 'signup'}
				<ProgressRing value={null} size="size-7" />
			{:else}
				Sign Up
			{/if}
		</button>
	</label>


	{#if errorMessage}
		<div class="alert preset-tonal-error mt-4 p-2">
			<span>{error}</span>
		</div>
	{/if}
</form>

<script lang="ts">
	import { saveCredentialToFactory } from '$lib/accountFactory';
	import { createSignerClient } from '$lib/client';
	import { toWebAuthnP256SimpleAccount } from '$lib/account';
	import { createWebAuthnCredential, toWebAuthnAccount } from 'viem/account-abstraction';
	import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
	import { setSession } from '$lib/state/session.svelte';
	import { getPublicKeyByCredentialId } from '$lib/accountFactory/getPublicKeyByCredentialId';
	import { toHex, concatHex } from 'viem';

	const isUserAbortError = (e: Error) => ['WebAuthnP256.CredentialCreationFailedError', 'NotAllowedError'].includes(e.name)

	const client = createSignerClient();
	let error: Error | null = $state(null);
	const errorMessage: string | null = $derived.by(() => {
		if (!error || isUserAbortError(error)) {
			return null;
		}
		return error.message;
	});
	let username: string = $state('');
	let loading: boolean = $state(false);
	let lastAction: 'login' | 'signup' | null = $state(null);

	$effect(() => {
		if (error && !isUserAbortError(error)) {
			console.error(error);
		}
	});

	async function signup() {
		try {
			loading = true;
			lastAction = 'signup';
			error = null;
			const challenge = new Uint8Array(32);
			crypto.getRandomValues(challenge);
			const credential = await createWebAuthnCredential({ challenge, user: { name: username } });
			await saveCredentialToFactory({ client, credential: credential });
			const account = await toWebAuthnP256SimpleAccount({
				client,
				owner: toWebAuthnAccount({ credential })
			});
			setSession({ account });
		} catch (e: unknown) {
			error = e as Error;
		} finally {
			loading = false;
		}
	}

	async function login() {
		try {
			loading = true;
			lastAction = 'login';
			error = null;
			const challenge = new Uint8Array(32);
			crypto.getRandomValues(challenge);
			const credential = (await navigator.credentials.get({
				publicKey: {
					challenge,
					allowCredentials: []
				}
			})) as PublicKeyCredential;
			const [x, y] = await getPublicKeyByCredentialId({
				client,
				credentialId: toHex(new Uint8Array(credential.rawId))
			});

			setSession({
				account: await toWebAuthnP256SimpleAccount({
					client,
					owner: toWebAuthnAccount({ credential: { ...credential, publicKey: concatHex([x, y]) } })
				})
			});
		} catch (e: unknown) {
			error = e as Error;
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
