// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SampleERC20 is ERC20 {
    constructor() ERC20("Sample Token", "STKN") {
        // Initial supply is 0
    }
    
    // Anyone can mint tokens
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
