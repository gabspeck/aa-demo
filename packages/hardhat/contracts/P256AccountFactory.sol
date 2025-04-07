// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {SenderCreator} from "@account-abstraction/contracts/core/SenderCreator.sol";
import {P256Account} from "./P256Account.sol";
import {AccountRegistry} from "./AccountRegistry.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * A sample factory contract for P256Account
 * A UserOperations "initCode" holds the address of the factory, and a method call (to createAccount, in this sample factory).
 * The factory's createAccount returns the target account address even if it is already installed.
 * This way, the entryPoint.getSenderAddress() can be called either before or after the account is created.
 */
contract P256AccountFactory is AccountRegistry {
    P256Account public immutable accountImplementation;
    uint256 private immutable salt;

    constructor(IEntryPoint _entryPoint, uint256 _salt) {
        accountImplementation = new P256Account(_entryPoint);
        salt = _salt;
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
    ) public returns (P256Account ret) {
        // Not available on 0.7
        // require(
        //     msg.sender == address(senderCreator),
        //     "only callable from SenderCreator"
        // );
        address addr = getAddress(qx, qy);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return P256Account(payable(addr));
        }
        ret = P256Account(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    abi.encodeCall(P256Account.initialize, (qx, qy))
                )
            )
        );
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function getAddress(
        bytes32 qx,
        bytes32 qy
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeCall(P256Account.initialize, (qx, qy))
                        )
                    )
                )
            );
    }
}
