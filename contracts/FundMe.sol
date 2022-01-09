// SPDX-License-Identifier: MIT

pragma solidity >=0.4.9 <0.9.0;

// import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
// import "@chainlink/contracts/src/v0.6/vendor/SafeMathChainlink.sol";
// import "asdasd";
import "./HederaTokenService.sol";

contract FundMe is HederaTokenService {
    // using SafeMathChainlink for uint256;
    // function transferMultipleTokens(
    //     IHederaTokenService.TokenTransferList[] memory tokenTransfers
    // ) external {
    //     int256 response = HederaTokenService.cryptoTransfer(tokenTransfers);
    //     if (response != HederaResponseCodes.SUCCESS) {
    //         revert("Crypto Transfer Failed");
    //     }
    // }

    mapping(address => uint256) public addressToAmountFunded;
    address[] public funders;
    address public owner;
    uint256 public price;

    constructor(uint256 _price) {
        price = _price;
        owner = msg.sender;
    }

    function fund() public payable {
        uint256 minimumUSD = 50 * 10**18;
        require(msg.value >= price, "You need to spend more ETH!");
        addressToAmountFunded[msg.sender] += msg.value;
        funders.push(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function getEntranceFee() public view returns (uint256) {
        uint256 minimumUSD = 50 * 10**18;
        // uint256 price = getPrice();
        uint256 precision = 1 * 10**18;
        return (minimumUSD * precision) / price;
    }

    function withdraw() public payable onlyOwner {
        msg.sender.transfer(address(this).balance);
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        funders = new address[](0);
    }
}
