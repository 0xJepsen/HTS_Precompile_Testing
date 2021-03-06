// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract Minting is HederaTokenService {
    address tokenAddress;

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    //Mint
    function mintFungibleToken(uint64 _amount) external {
        (
            int256 response,
            uint64 newTotalSupply,
            int64[] memory serialNumbers
        ) = HederaTokenService.mintToken(tokenAddress, _amount, new bytes[](0));

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Mint Failed");
        }
    }

    // Associate
    function tokenAssociate(address _account) external {
        int256 response = HederaTokenService.associateToken(
            _account,
            tokenAddress
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Associate Failed");
        }
    }

    // Transfer
    function tokenTransfer(
        address _sender,
        address _receiver,
        int64 _amount
    ) external {
        int256 response = HederaTokenService.transferToken(
            tokenAddress,
            _sender,
            _receiver,
            _amount
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Token Transfer Failed");
        }
    }
}
