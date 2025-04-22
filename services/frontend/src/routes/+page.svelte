<main class="bg-blue-100 w-screen h-screen flex justify-center items-center">
	<div class="bg-white h-3/4 w-full max-w-xl border-15 shadow-xl flex flex-col items-center justify-center">
		<form class="flex flex-col" onsubmit={submit}>
			<input class="form-input" placeholder="Username">
			<div class="flex flex-col mt-5">
				<button name="action" value="signup" class="form-input">Log in</button>
				<button name="action" value="login" class="form-input">Sign up</button>
			</div>
		</form>
	</div>
</main>


<script lang="ts">

	import { createCredential } from 'ox/WebAuthnP256';
	import { saveCredentialToFactory } from '$lib/accountFactory';
	import { createSignerClient } from '$lib/client';
	import { sessionState } from '$lib/state/session.svelte';
	import { toHex } from 'viem';
	import { toWebAuthnP256SimpleAccount } from '$lib/account';
	import { toWebAuthnAccount } from 'viem/account-abstraction';

	const client = createSignerClient()

	async function signup(username: string) {
		const challenge = new Uint8Array(32);
		crypto.getRandomValues(challenge);
		const credential = await createCredential({
			user: {
				name: username
			},
			challenge
		});
		await saveCredentialToFactory({client, credential: credential})
		await toWebAuthnP256SimpleAccount({
			client,
			owner: toWebAuthnAccount({credential})
		})
		sessionState.credentialId = toHex(new Uint8Array(credential.raw.rawId))
	}

	async function login(username: string) {
	}

	const handlers: Record<string, (username: string) => Promise<void>> = {
		signup,
		login
	};

	async function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		await handlers[(e.submitter as HTMLButtonElement).value](data.get('username') as string);
	}
</script>
