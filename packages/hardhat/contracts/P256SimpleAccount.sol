// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {BaseAccount, PackedUserOperation} from "@account-abstraction/contracts/core/BaseAccount.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";
import {TokenCallbackHandler} from "@account-abstraction/contracts/accounts/callback/TokenCallbackHandler.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {SignerP256} from "../vendor/openzeppelin-community-contracts/contracts/utils/cryptography/SignerP256.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract P256SimpleAccount is
    BaseAccount,
    TokenCallbackHandler,
    UUPSUpgradeable,
    Initializable,
    SignerP256,
    IERC1271
{
    error OnlyOwner();
    error OnlyOwnerOrEntryPoint();

    IEntryPoint private immutable _entryPoint;

    event P256SimpleAccountInitialized(
        IEntryPoint indexed entryPoint,
        bytes32 qx,
        bytes32 qy
    );

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        // Directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == address(this), OnlyOwner());
    }

    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of SimpleAccount must be deployed with the new EntryPoint address, then upgrading
     * the implementation by calling `upgradeTo()`
     */
    function initialize(bytes32 qx, bytes32 qy) public virtual initializer {
        _initialize(qx, qy);
    }

    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        if (SignerP256._rawSignatureValidation(userOpHash, userOp.signature)) {
            validationData = SIG_VALIDATION_SUCCESS;
        }
        validationData = SIG_VALIDATION_FAILED;
    }

    function _initialize(bytes32 qx, bytes32 qy) internal virtual {
        emit P256SimpleAccountInitialized(_entryPoint, qx, qy);
    }

    // Require the function call went through EntryPoint or owner
    function _requireForExecute() internal view virtual override {
        require(msg.sender == address(entryPoint()) || msg.sender == address(this), OnlyOwnerOrEntryPoint());
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal view override {
        (newImplementation);
        _onlyOwner();
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue) {
        if (_rawSignatureValidation(hash, signature)) {
            return 0x1626ba7e;
        }
        return 0x0;
    }
}
