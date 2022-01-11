// SPDX-License-Identifier: MIT

pragma solidity >=0.4.9 <0.9.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract FundMe is HederaTokenService {
    address tokenAddress;
    int64 deposited;
    uint256 lastWithdrawalTime;

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    function depositTokens(int64 amount) public {
        int256 response = HederaTokenService.transferToken(
            tokenAddress,
            msg.sender,
            address(this),
            amount
        );
        if (response != HederaResponseCodes.SUCCESS) {
            revert("Deposit Failed");
        }

        deposited += amount;
    }

    function withdrawTokens() external {
        if (block.timestamp <= lastWithdrawalTime) {
            revert("Already withdrew this second");
        }

        int256 associateResponse = HederaTokenService.associateToken(
            msg.sender,
            tokenAddress
        );
        if (associateResponse != HederaResponseCodes.SUCCESS) {
            revert("Could not associate account");
        }

        depositTokens(-deposited / 2);

        lastWithdrawalTime = block.timestamp;
    }

    function tokenAssociate(address _sender, address _tokenAddress) external {
        int256 response = HederaTokenService.associateToken(
            _sender,
            _tokenAddress
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Associate Failed");
        }
    }
}
