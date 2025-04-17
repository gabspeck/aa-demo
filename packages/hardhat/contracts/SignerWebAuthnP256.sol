// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AbstractSigner} from "../vendor/openzeppelin-community-contracts/contracts/utils/cryptography/AbstractSigner.sol";
import {P256} from "@openzeppelin/contracts/utils/cryptography/P256.sol";
import {WebAuthn} from "./WebAuthn.sol";
abstract contract SignerWebAuthnP256 is AbstractSigner {

    bytes32 private _qx;
    bytes32 private _qy;

    error SignerWebAuthnP256InvalidPublicKey(bytes32 qx, bytes32 qy);

    /**
     * @dev Sets the signer with a P256 public key. This function should be called during construction
     * or through an initializer.
     */
    function _setSigner(bytes32 qx, bytes32 qy) internal {
        if (!P256.isValidPublicKey(qx, qy)) revert SignerWebAuthnP256InvalidPublicKey(qx, qy);
        _qx = qx;
        _qy = qy;
    }


    /// @dev Return the signer's P256 public key.
    function signer() public view virtual returns (bytes32 qx, bytes32 qy) {
        return (_qx, _qy);
    }

	function _rawSignatureValidation(bytes32 hash, bytes calldata signature) internal view virtual override returns (bool){
		WebAuthn.WebAuthnAuth memory auth = abi.decode(signature, (WebAuthn.WebAuthnAuth));
		(bytes32 qx, bytes32 qy) = signer();
		return WebAuthn.verify(bytes.concat(hash), false, auth, qx, qy);
	}
}
