import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import 'hardhat-dependency-compiler';
import 'hardhat-tracer';

const config: HardhatUserConfig = {
	ignition: {
		requiredConfirmations: 1,
		strategyConfig: {
			create2: {
				salt: '0x0000000000000000000000000000000000000000000000000000000000000000'
			}
		}
	},
	networks: {
		hardhat: {
			enableRip7212: true
		}
	},
	solidity: {
		version: '0.8.28',
		settings: {
			viaIR: true,
			evmVersion: 'cancun'
		}
	},
	dependencyCompiler: {
		paths: [
			'@account-abstraction/contracts/core/EntryPoint.sol'
		]
	}
};

export default config;
