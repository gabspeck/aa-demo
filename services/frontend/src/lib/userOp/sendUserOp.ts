import type { WalletClient } from 'viem';
import { type Call } from 'viem';
import type { BundlerClient, SmartAccount, UserOperation } from 'viem/account-abstraction';

export type SendUserOpInput = {
	client: WalletClient;
	bundlerClient: BundlerClient;
	smartAccount: SmartAccount;
	calls: Call[];
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
};

export async function sendUserOp({
	bundlerClient,
	smartAccount,
	calls,
	maxPriorityFeePerGas,
	maxFeePerGas
}: SendUserOpInput) {
	const userOp = {
		account: smartAccount,
		calls
	};
	const estimatedGas = await bundlerClient.estimateUserOperationGas(userOp);
	const fixedEstimations = {
		...estimatedGas,
		preVerificationGas: estimatedGas.preVerificationGas * 2n,
		verificationGasLimit: estimatedGas.verificationGasLimit * 2n
	};
	const preparedOp: UserOperation = (await bundlerClient.prepareUserOperation({
		...userOp,
		...fixedEstimations,
		maxFeePerGas,
		maxPriorityFeePerGas
	})) as UserOperation;
	preparedOp.signature = await smartAccount.signUserOperation(preparedOp);
	return bundlerClient.sendUserOperation(preparedOp);
}
