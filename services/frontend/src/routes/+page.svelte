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
        <form>
            <label>Parse Entrypoint Error
                <textarea bind:value={entryPointReturnData} class="form-textarea"></textarea>
            </label>
            {#if parsedEntryPointData}
                <p>{parsedEntryPointData}</p>
            {/if}
        </form>
        {#if cred}
            <p>Credential ID: {cred.id}</p>
            {#await xyPromise}
                <p>Retrieving public key coords...</p>
            {:then {x, y}}
                <p>x: {x}</p>
                <p>y: {y}</p>
            {:catch e}
                <p>Error retrieving public key: {e}</p>
            {/await}
            {#await accountAddressPromise}
                <p>Retrieving address...</p>
            {:then address}
                <p>Computed address: {address}</p>
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
    import {
        p256SimpleAccountAbi,
        p256SimpleAccountFactoryAbi,
        sampleErc20Abi
    } from "@appliedblockchain/aa-demo-contracts";
    import {
        createBundlerClient,
        createWebAuthnCredential,
        type CreateWebAuthnCredentialReturnType,
        getUserOperationHash,
        toSmartAccount,
        toWebAuthnAccount,
        type UserOperation
    } from "viem/account-abstraction";
    import {
        type Address, concatHex,
        createWalletClient,
        decodeErrorResult,
        encodeFunctionData,
        getContract,
        type Hex,
        http, keccak256,
        publicActions,
        type SignableMessage,
        toHex,
        type TypedData,
        type TypedDataDefinition,
        type UnionPartialBy
    } from "viem";
    import {privateKeyToAccount} from "viem/accounts";
    import {hardhat} from "viem/chains";

    const rpcEndpoint = "http://localhost:8545"
    const bundlerRpcEndpoint = "http://localhost:3000/rpc"
    const relayerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    const factoryAddress = "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707"
    const erc20TokenAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
    const entryPointV08Address = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108'
    const relayerAccount = privateKeyToAccount(relayerKey)
    const client = createWalletClient({
        account: relayerAccount,
        chain: hardhat,
        transport: http(rpcEndpoint)
    }).extend(publicActions)
    const bundlerClient = createBundlerClient({transport: http(bundlerRpcEndpoint), chain: hardhat})
    const factoryContract = getContract({
        client,
        abi: p256SimpleAccountFactoryAbi,
        address: factoryAddress,
    })
    const erc20TokenContract = getContract({
        client,
        abi: sampleErc20Abi,
        address: erc20TokenAddress
    })

    const entryPointV08Abi =
        [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "inputs": [
                    {
                        "internalType": "bool",
                        "name": "success",
                        "type": "bool"
                    },
                    {
                        "internalType": "bytes",
                        "name": "ret",
                        "type": "bytes"
                    }
                ],
                "name": "DelegateAndRevert",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "opIndex",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "reason",
                        "type": "string"
                    }
                ],
                "name": "FailedOp",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "opIndex",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "reason",
                        "type": "string"
                    },
                    {
                        "internalType": "bytes",
                        "name": "inner",
                        "type": "bytes"
                    }
                ],
                "name": "FailedOpWithRevert",
                "type": "error"
            },
            {
                "inputs": [],
                "name": "InvalidShortString",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes",
                        "name": "returnData",
                        "type": "bytes"
                    }
                ],
                "name": "PostOpReverted",
                "type": "error"
            },
            {
                "inputs": [],
                "name": "ReentrancyGuardReentrantCall",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    }
                ],
                "name": "SenderAddressResult",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "aggregator",
                        "type": "address"
                    }
                ],
                "name": "SignatureValidationFailed",
                "type": "error"
            },
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "str",
                        "type": "string"
                    }
                ],
                "name": "StringTooLong",
                "type": "error"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "factory",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "paymaster",
                        "type": "address"
                    }
                ],
                "name": "AccountDeployed",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "BeforeExecution",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "totalDeposit",
                        "type": "uint256"
                    }
                ],
                "name": "Deposited",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "EIP712DomainChanged",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "bytes",
                        "name": "revertReason",
                        "type": "bytes"
                    }
                ],
                "name": "PostOpRevertReason",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "aggregator",
                        "type": "address"
                    }
                ],
                "name": "SignatureAggregatorChanged",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "totalStaked",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256"
                    }
                ],
                "name": "StakeLocked",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "withdrawTime",
                        "type": "uint256"
                    }
                ],
                "name": "StakeUnlocked",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "withdrawAddress",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "StakeWithdrawn",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "paymaster",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "bool",
                        "name": "success",
                        "type": "bool"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "actualGasCost",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "actualGasUsed",
                        "type": "uint256"
                    }
                ],
                "name": "UserOperationEvent",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    }
                ],
                "name": "UserOperationPrefundTooLow",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "bytes",
                        "name": "revertReason",
                        "type": "bytes"
                    }
                ],
                "name": "UserOperationRevertReason",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "withdrawAddress",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "Withdrawn",
                "type": "event"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint32",
                        "name": "unstakeDelaySec",
                        "type": "uint32"
                    }
                ],
                "name": "addStake",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "balanceOf",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "target",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "name": "delegateAndRevert",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "depositTo",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "eip712Domain",
                "outputs": [
                    {
                        "internalType": "bytes1",
                        "name": "fields",
                        "type": "bytes1"
                    },
                    {
                        "internalType": "string",
                        "name": "name",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "version",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "chainId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "verifyingContract",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "salt",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256[]",
                        "name": "extensions",
                        "type": "uint256[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "getDepositInfo",
                "outputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "deposit",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bool",
                                "name": "staked",
                                "type": "bool"
                            },
                            {
                                "internalType": "uint112",
                                "name": "stake",
                                "type": "uint112"
                            },
                            {
                                "internalType": "uint32",
                                "name": "unstakeDelaySec",
                                "type": "uint32"
                            },
                            {
                                "internalType": "uint48",
                                "name": "withdrawTime",
                                "type": "uint48"
                            }
                        ],
                        "internalType": "struct IStakeManager.DepositInfo",
                        "name": "info",
                        "type": "tuple"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getDomainSeparatorV4",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "key",
                        "type": "uint192"
                    }
                ],
                "name": "getNonce",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getPackedUserOpTypeHash",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "pure",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes",
                        "name": "initCode",
                        "type": "bytes"
                    }
                ],
                "name": "getSenderAddress",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bytes",
                                "name": "initCode",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes",
                                "name": "callData",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "accountGasLimits",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "uint256",
                                "name": "preVerificationGas",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "gasFees",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "bytes",
                                "name": "paymasterAndData",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes",
                                "name": "signature",
                                "type": "bytes"
                            }
                        ],
                        "internalType": "struct PackedUserOperation",
                        "name": "userOp",
                        "type": "tuple"
                    }
                ],
                "name": "getUserOpHash",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "address",
                                        "name": "sender",
                                        "type": "address"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "nonce",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "initCode",
                                        "type": "bytes"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "callData",
                                        "type": "bytes"
                                    },
                                    {
                                        "internalType": "bytes32",
                                        "name": "accountGasLimits",
                                        "type": "bytes32"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "preVerificationGas",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "bytes32",
                                        "name": "gasFees",
                                        "type": "bytes32"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "paymasterAndData",
                                        "type": "bytes"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "signature",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct PackedUserOperation[]",
                                "name": "userOps",
                                "type": "tuple[]"
                            },
                            {
                                "internalType": "contract IAggregator",
                                "name": "aggregator",
                                "type": "address"
                            },
                            {
                                "internalType": "bytes",
                                "name": "signature",
                                "type": "bytes"
                            }
                        ],
                        "internalType": "struct IEntryPoint.UserOpsPerAggregator[]",
                        "name": "opsPerAggregator",
                        "type": "tuple[]"
                    },
                    {
                        "internalType": "address payable",
                        "name": "beneficiary",
                        "type": "address"
                    }
                ],
                "name": "handleAggregatedOps",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bytes",
                                "name": "initCode",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes",
                                "name": "callData",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "accountGasLimits",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "uint256",
                                "name": "preVerificationGas",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "gasFees",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "bytes",
                                "name": "paymasterAndData",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes",
                                "name": "signature",
                                "type": "bytes"
                            }
                        ],
                        "internalType": "struct PackedUserOperation[]",
                        "name": "ops",
                        "type": "tuple[]"
                    },
                    {
                        "internalType": "address payable",
                        "name": "beneficiary",
                        "type": "address"
                    }
                ],
                "name": "handleOps",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint192",
                        "name": "key",
                        "type": "uint192"
                    }
                ],
                "name": "incrementNonce",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes",
                        "name": "callData",
                        "type": "bytes"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "address",
                                        "name": "sender",
                                        "type": "address"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "nonce",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "verificationGasLimit",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "callGasLimit",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "paymasterVerificationGasLimit",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "paymasterPostOpGasLimit",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "preVerificationGas",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "address",
                                        "name": "paymaster",
                                        "type": "address"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "maxFeePerGas",
                                        "type": "uint256"
                                    },
                                    {
                                        "internalType": "uint256",
                                        "name": "maxPriorityFeePerGas",
                                        "type": "uint256"
                                    }
                                ],
                                "internalType": "struct EntryPoint.MemoryUserOp",
                                "name": "mUserOp",
                                "type": "tuple"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "userOpHash",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "uint256",
                                "name": "prefund",
                                "type": "uint256"
                            },
                            {
                                "internalType": "uint256",
                                "name": "contextOffset",
                                "type": "uint256"
                            },
                            {
                                "internalType": "uint256",
                                "name": "preOpGas",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct EntryPoint.UserOpInfo",
                        "name": "opInfo",
                        "type": "tuple"
                    },
                    {
                        "internalType": "bytes",
                        "name": "context",
                        "type": "bytes"
                    }
                ],
                "name": "innerHandleOp",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "actualGasCost",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "",
                        "type": "uint192"
                    }
                ],
                "name": "nonceSequenceNumber",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "senderCreator",
                "outputs": [
                    {
                        "internalType": "contract ISenderCreator",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes4",
                        "name": "interfaceId",
                        "type": "bytes4"
                    }
                ],
                "name": "supportsInterface",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "unlockStake",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address payable",
                        "name": "withdrawAddress",
                        "type": "address"
                    }
                ],
                "name": "withdrawStake",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address payable",
                        "name": "withdrawAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "withdrawAmount",
                        "type": "uint256"
                    }
                ],
                "name": "withdrawTo",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "stateMutability": "payable",
                "type": "receive"
            }
        ] as const
    let username = $state('')
    let cred: PublicKeyCredential & {
        response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
    } | null = $state(null)
    const xyPromise = $derived.by(async () => {
        if (cred) {
            if (cred.response instanceof AuthenticatorAttestationResponse) {
                return extractXYCoords(new Uint8Array(cred.response.getPublicKey()!))
            }
            const [x, y] = await factoryContract.read.getCredentialPublicKey([toHex(new Uint8Array(cred.rawId))])
            return {x, y}
        }
        return {x: null, y: null}
    })
    const webauthnAccountPromise = $derived.by(async () => {
        const {x, y} = await xyPromise
        if (cred && x && y) {
            return toWebAuthnAccount({
                credential: {
                    id: toHex(new Uint8Array(cred.rawId)),
                    publicKey: concatHex([x, y])
                }
            })
        }
        return null
    })
    const accountAddressPromise = $derived.by(async () => {
        const {x, y} = await xyPromise
        if (x && y) {
            return await factoryContract.read.getAddress([x, y])
        }
    })
    const accountContractPromise = $derived.by(async () => {
        const accountAddress = await accountAddressPromise
        if (accountAddress) {
            return getContract({
                client,
                abi: p256SimpleAccountAbi,
                address: accountAddress
            })
        }
    })
    let entryPointReturnData = $state('')
    const parsedEntryPointData = $derived.by(() => {
        if (entryPointReturnData) {
            try {
                const result = decodeErrorResult({abi: entryPointV08Abi, data: entryPointReturnData as Hex})
                return `${result.errorName}(${result.args})`
            } catch (e) {
                return (e as Error).message
            }
        }
    })


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
        await factoryContract.write.saveCredentialPublicKey([toHex(cred.id), x, y])
    }

    async function sendUserOp() {
        const address = (await accountAddressPromise)!
        const account = await webauthnAccountPromise
        const {x,y} = await xyPromise
        const smartAccount = await toSmartAccount({
            client,
            entryPoint: {
                version: '0.8',
                address: entryPointV08Address,
                abi: entryPointV08Abi
            },
            getAddress: async function (): Promise<Address> {
                return address;
            },
            encodeCalls: async function (calls: readonly {
                to: Hex;
                data?: Hex | undefined;
                value?: bigint | undefined;
            }[]): Promise<Hex> {
                if (calls.length === 1) {
                    return encodeFunctionData({
                        abi: p256SimpleAccountAbi,
                        functionName: 'execute',
                        args: [calls[0].to, calls[0].value ?? 0n, calls[0].data ?? '0x']
                    })
                }
                return encodeFunctionData({
                    abi: p256SimpleAccountAbi,
                    functionName: 'executeBatch',
                    args: [
                        calls.map((call) => ({
                            data: call.data ?? '0x',
                            target: call.to,
                            value: call.value ?? 0n
                        }))
                    ]
                })
            },
            getFactoryArgs: async function (): Promise<{
                factory?: Address | undefined;
                factoryData?: Hex | undefined;
            }> {
                const factoryData = encodeFunctionData({
                    abi: factoryContract.abi,
                    functionName: 'createAccount',
                    args: [x!, y!]
                })
                console.log(keccak256(new TextEncoder().encode("createAccount(bytes32,bytes32)")))
                console.log({factoryAddress, factoryData})
                return {factory: factoryAddress, factoryData}
            },
            getStubSignature: async function (): Promise<Hex> {
                return '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000'
            },
            signUserOperation: async function (parameters: UnionPartialBy<UserOperation, "sender"> & {
                chainId?: number | undefined;
            }): Promise<Hex> {
                const {chainId = client.chain!.id, ...userOperation} = parameters
                const hash = getUserOperationHash({
                    chainId,
                    entryPointAddress: entryPointV08Address,
                    entryPointVersion: '0.8',
                    userOperation: {
                        ...userOperation,
                        sender: address
                    }
                })
                return (await account!.sign({hash})).signature
            },
            signMessage: async function ({message}: { message: SignableMessage; }): Promise<Hex> {
                const sig = await account!.signMessage({message})
                return sig.signature
            },
            signTypedData: async function <const typedData extends TypedData | Record<string, unknown>, primaryType extends keyof typedData | "EIP712Domain" = keyof typedData>(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
                const sig = await account!.signTypedData(parameters)
                return sig.signature
            }
        })
        const preparedUserOp = await bundlerClient.prepareUserOperation({
            account: smartAccount,
            calls: [{
                to: erc20TokenAddress,
                data: encodeFunctionData({
                    abi: erc20TokenContract.abi,
                    functionName: 'mint',
                    args: [address, 100n]
                })
            }]
        })
        console.log({preparedUserOp})
    }

    async function retrieveCredential() {
        const challengeArray = new Uint8Array(32)
        cred = await navigator.credentials.get({publicKey: {challenge: challengeArray}}) as PublicKeyCredential & {
            response: AuthenticatorAssertionResponse | AuthenticatorAttestationResponse
        }
        if (!cred) {
            throw new Error("No credential returned")
        }
    }

</script>
