// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {P256} from "@openzeppelin/contracts/utils/cryptography/P256.sol";

struct PublicKey {
	bytes32 x;
	bytes32 y;
}

contract PublicKeyRegistry {

	mapping(bytes id => PublicKey) private _keys;

	error PublicKeyRegistryKeyAlreadyRegistered(bytes32 x, bytes32 y);
	error PublicKeyRegistryInvalidPublicKey(bytes32 x, bytes32 y);

	function getCredentialPublicKey(bytes calldata id) view external returns (bytes32 x, bytes32 y){
		return (_keys[id].x, _keys[id].y);
	}

	function saveCredentialPublicKey(bytes calldata id, bytes32 x, bytes32 y) external {
		if (_keys[id].x != 0) {
			revert PublicKeyRegistryKeyAlreadyRegistered(x, y);
		}
		if (!P256.isValidPublicKey(x, y)) {
			revert PublicKeyRegistryInvalidPublicKey(x, y);
		}
		_keys[id].x = x;
		_keys[id].y = y;
	}

}
