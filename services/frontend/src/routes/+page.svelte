<main class="w-full h-full">
    <div class="m-5">
        <form onsubmit={saveCredential}>
            <h2>Create credential and save to registry</h2>
            <input class="form-input" name="username" bind:value={username} required>
            <button type="submit" class="form-input">Create credential</button>
        </form>
        <form class="my-5" onsubmit={retrieveCredential}>
            <button type="submit" class="form-input">Retrieve Credential</button>
        </form>
        {#if cred}
            <p>Credential ID: {cred.id}</p>
            <p>x: {x}</p>
            <p>y: {y}</p>
            <form onsubmit={sendUserOp}>
                <button type="submit">Send User Op</button>
            </form>
        {:else}
            <p>Create or retrieve a credential to begin</p>
        {/if}
    </div>
</main>


<script lang="ts">
    import {p256SimpleAccountFactoryAbi} from "@appliedblockchain/aa-demo-contracts";
    import {
        createBundlerClient,
        createWebAuthnCredential,
        type CreateWebAuthnCredentialReturnType, sendUserOperation,
        toWebAuthnAccount
    } from "viem/account-abstraction";
    import {createWalletClient, getContract, http, toHex} from "viem";
    import {privateKeyToAccount} from "viem/accounts";
    import {getTransactionReceipt} from "viem/actions";

    const rpcEndpoint = "http://localhost:8545"
    const bundlerRpcEndpoint = "http://localhost:3000"
    const relayerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    const factoryAddress = "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707"
    const relayerAccount = privateKeyToAccount(relayerKey)
    const client = createWalletClient({account: relayerAccount, transport: http(rpcEndpoint)})
    const bundlerClient = createBundlerClient({transport: http(bundlerRpcEndpoint)})
    const factoryContract = getContract({
        client,
        abi: p256SimpleAccountFactoryAbi,
        address: factoryAddress,
    })

    let username = $state('')
    let x = $state('')
    let y = $state('')
    let cred: PublicKeyCredential & { response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse } | null = $state(null)

    type CreateWebAuthnCredentialAttestationReturnType = CreateWebAuthnCredentialReturnType & {
        raw: CreateWebAuthnCredentialReturnType['raw'] & {
            response: AuthenticatorAttestationResponse
        }
    }

    function extractXYCoords(key: Uint8Array) {
        return {x: toHex(new Uint8Array(key.slice(-64, -32))), y: toHex(new Uint8Array(key.slice(-32)))}
    }

    async function saveCredential(e: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
        e.preventDefault()
        const challengeArray = new Uint8Array(32);
        const viemCred = await createWebAuthnCredential({
            name: username,
            challenge: crypto.getRandomValues(challengeArray)
        }) as CreateWebAuthnCredentialAttestationReturnType
        cred = viemCred.raw as unknown as PublicKeyCredential & { response: AuthenticatorAttestationResponse }
        const key = (cred.response as AuthenticatorAttestationResponse).getPublicKey()
        if (key == null) {
            throw new Error("No public key found")
        }
        const {x, y} = extractXYCoords(new Uint8Array(key))
        const txHash = await factoryContract.write.saveCredentialPublicKey([toHex(cred.id), x, y])
        const receipt = await getTransactionReceipt(client, {hash: txHash})
        const account = toWebAuthnAccount({credential: viemCred})
    }

    async function sendUserOp() {
        // todo: create smart account instance and pass it to sendUserOperation
        await sendUserOperation(bundlerClient, {
            // account
        })
    }

    async function retrieveCredential() {
        const challengeArray = new Uint8Array(32)
        cred = await navigator.credentials.get({publicKey: {challenge: challengeArray}}) as PublicKeyCredential & {
            response: AuthenticatorAssertionResponse | AuthenticatorAttestationResponse
        }
        if (!cred) {
            throw new Error("No credential returned")
        }

        const result = await factoryContract.read.getCredentialPublicKey([toHex(cred.id)])
        ;([x, y] = result)
    }

</script>
