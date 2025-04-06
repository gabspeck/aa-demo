// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Account} from "./vendor/oz-community/account/Account.sol";
import {SignerP256} from "./vendor/oz-community/utils/cryptography/SignerP256.sol";
import {ERC7821} from "solady/src/accounts/ERC7821.sol";
import {Receiver} from "solady/src/accounts/Receiver.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract P256Account is
    IERC721Receiver,
    IERC1155Receiver,
    SignerP256,
    Account,
    ERC7821,
    UUPSUpgradeable,
	Initializable
{

	error OnlyOwner();
    error InvalidCredentialIdLength(uint256 actualLenght);

    bytes private _credentialId;

	IEntryPoint private immutable _entrypoint;

    constructor(IEntryPoint entryPoint) {
		_entrypoint = entryPoint;
    }

	function _onlyOwner() internal view {
		if (msg.sender != address(this)) {
			revert OnlyOwner();
		}
	}

	function initialize(bytes calldata cid, bytes32 qx, bytes32 qy) public virtual initializer {
        if (cid.length < 16) {
            revert InvalidCredentialIdLength(cid.length);
        }
        _credentialId = cid;
		_setSigner(qx, qy);
		_disableInitializers();
	}

    function credentialId() public view returns (bytes memory){
        return _credentialId;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }

	function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }

    receive() external payable virtual override(Account, Receiver) {}
}
