// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ISenderCreator} from "@account-abstraction/contracts/interfaces/ISenderCreator.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {P256SimpleAccount} from "./P256SimpleAccount.sol";
import {PublicKeyRegistry} from "./PublicKeyRegistry.sol";

/**
 * A sample factory contract for SimpleAccount
 * A UserOperations "initCode" holds the address of the factory, and a method call (to createAccount, in this sample factory).
 * The factory's createAccount returns the target account address even if it is already installed.
 * This way, the entryPoint.getSenderAddress() can be called either before or after the account is created.
 */
contract P256SimpleAccountFactory is PublicKeyRegistry {
    P256SimpleAccount public immutable accountImplementation;
    ISenderCreator public immutable senderCreator;

	error OnlySenderCreator();

    uint256 public immutable salt;

    constructor(IEntryPoint _entryPoint, uint256 _salt) {
        accountImplementation = new P256SimpleAccount(_entryPoint);
        salt = _salt;
        senderCreator = _entryPoint.senderCreator();
    }

    /**
     * create an account, and return its address.
     * returns the address even if the account is already deployed.
     * Note that during UserOperation execution, this method is called only if the account is not deployed.
     * This method returns an existing account address so that entryPoint.getSenderAddress() would work even after account creation
     */
    function createAccount(
        bytes32 qx,
        bytes32 qy
    ) public returns (P256SimpleAccount ret) {
        require(
            msg.sender == address(senderCreator),
			OnlySenderCreator()
        );
        address addr = getAddress(qx, qy);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return P256SimpleAccount(payable(addr));
        }
        ret = P256SimpleAccount(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    abi.encodeCall(P256SimpleAccount.initialize, (qx, qy))
                )
            )
        );
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function getAddress(bytes32 qx, bytes32 qy) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeCall(
                                P256SimpleAccount.initialize,
                                (qx, qy)
                            )
                        )
                    )
                )
            );
    }
}
