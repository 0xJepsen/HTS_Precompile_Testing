var solc = require('solc');

var input = {
  language: 'Solidity',
  sources: {
    'contracts/FundMe.sol': {
      content: 'contract C { function f() public { } }'
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

var output = JSON.parse(solc.compile(JSON.stringify(input)));

// `output` here contains the JSON output as specified in the documentation
for (var contractName in output.contracts['test.sol']) {
  console.log(
    contractName +
      ': ' +
      output.contracts['test.sol'][contractName].evm.bytecode.object
  );
}