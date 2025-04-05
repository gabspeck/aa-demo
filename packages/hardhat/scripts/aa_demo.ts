import hre, {ignition, viem} from 'hardhat'
import P256AccountFactoryModule from '../ignition/modules/P256AccountFactory'

async function main() {
	const module = await ignition.deploy(P256AccountFactoryModule)
	console.log(module.token.address)
}

void main()