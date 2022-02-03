console.clear();
require("dotenv").config();
const {
	Client,
	AccountId,
	PrivateKey,
	TokenCreateTransaction,
	FileCreateTransaction,
	FileAppendTransaction,
	ContractCreateTransaction,
	ContractFunctionParameters,
	TokenUpdateTransaction,
	ContractExecuteTransaction,
	TokenInfoQuery,
	AccountBalanceQuery,
	AccountCreateTransaction,
	Hbar,
} = require("@hashgraph/sdk");
const fs = require("fs");

const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	// STEP 1 ===================================
	console.log(`STEP 1 ===================================`);
	const bytecode = fs.readFileSync("./contracts_Minting_sol_Minting.bin");
	console.log(`- Done \n`);

	// STEP 2 ===================================
	console.log(`STEP 2 ===================================`);
	//Create a fungible token
	const tokenCreateTx = await new TokenCreateTransaction()
		.setTokenName("HTS Token")
		.setTokenSymbol("HTS")
		.setDecimals(0)
		.setInitialSupply(100)
		.setTreasuryAccountId(operatorId)
		.setAdminKey(operatorKey)
		.setSupplyKey(operatorKey)
		.freezeWith(client)
		.sign(operatorKey);
	const tokenCreateSubmit = await tokenCreateTx.execute(client);
	const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
	const tokenId = tokenCreateRx.tokenId;
	const tokenAddressSol = tokenId.toSolidityAddress();
	console.log(`- Token ID: ${tokenId}`);
	console.log(`- Token ID in Solidity format: ${tokenAddressSol}`);

	// Token query 1
	const tokenInfo1 = await tQueryFcn(tokenId);
	console.log(`- Initial token supply: ${tokenInfo1.totalSupply.low} \n`);

	//Create a file on Hedera and store the hex-encoded bytecode
	const fileCreateTx = new FileCreateTransaction().setKeys([operatorKey]);
	const fileSubmit = await fileCreateTx.execute(client);
	const fileCreateRx = await fileSubmit.getReceipt(client);
	const bytecodeFileId = fileCreateRx.fileId;
	console.log(`- The smart contract bytecode file ID is: ${bytecodeFileId}`);

	// Append contents to the file
	const fileAppendTx = new FileAppendTransaction()
		.setFileId(bytecodeFileId)
		.setContents(bytecode)
		.setMaxChunks(10)
		.setMaxTransactionFee(new Hbar(2));
	const fileAppendSubmit = await fileAppendTx.execute(client);
	const fileAppendRx = await fileAppendSubmit.getReceipt(client);
	console.log(`- Content added: ${fileAppendRx.status} \n`);

	// STEP 3 ===================================
	console.log(`STEP 3 ===================================`);
	// Create the smart contract
	const contractInstantiateTx = new ContractCreateTransaction()
		.setBytecodeFileId(bytecodeFileId)
		.setGas(3000000)
		.setConstructorParameters(new ContractFunctionParameters().addAddress(tokenAddressSol));
	const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
	const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
	const contractId = contractInstantiateRx.contractId;
	const contractAddress = contractId.toSolidityAddress();
	console.log(`- The smart contract ID is: ${contractId}`);
	console.log(`- The smart contract ID in Solidity format is: ${contractAddress} \n`);

	// Token query 2.1
	const tokenInfo2p1 = await tQueryFcn(tokenId);
	console.log(`- Token supply key: ${tokenInfo2p1.supplyKey.toString()}`);

	// Update the fungible token so the smart contract manages the supply
	const tokenUpdateTx = await new TokenUpdateTransaction()
		.setTokenId(tokenId)
		.setSupplyKey(contractId)
		.freezeWith(client)
		.sign(operatorKey);
	const tokenUpdateSubmit = await tokenUpdateTx.execute(client);
	const tokenUpdateRx = await tokenUpdateSubmit.getReceipt(client);
	console.log(`- Token update status: ${tokenUpdateRx.status}`);

	// Token query 2.2
	const tokenInfo2p2 = await tQueryFcn(tokenId);
	console.log(`- New token supply key: ${tokenInfo2p2.supplyKey.toString()} \n`);

	// STEP 4 ===================================
	console.log(`STEP 4 ===================================`);
	//Execute a contract function (mint)
	const contractExecTx = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("mintFungibleToken", 
			new ContractFunctionParameters().addUint64(150))
		.setMaxTransactionFee(new Hbar(2));
	const contractExecSubmit = await contractExecTx.execute(client);
	console.log("Testing")
	const contractExecRx = await contractExecSubmit.getReceipt(client);
	console.log(`- New tokens minted: ${contractExecRx.status.toString()}`);

	// Token query 3
	const tokenInfo3 = await tQueryFcn(tokenId);
	console.log(`- New token supply: ${tokenInfo3.totalSupply.low} \n`);

	const alicePrivateKey = await PrivateKey.generateED25519();
    const alicePublicKey = alicePrivateKey.publicKey;

    const aliceCreateAccount = await new AccountCreateTransaction()
        .setKey(alicePublicKey)
        .execute(client);

    const aliceReceipt = await aliceCreateAccount.getReceipt(client);
    const aliceAcountId = aliceReceipt.accountId;

	//Execute a contract function (associate)
	const contractExecTx1 = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("tokenAssociate", new ContractFunctionParameters().addAddress(aliceAcountId.toSolidityAddress()))
		.setMaxTransactionFee(new Hbar(2))
		.freezeWith(client);
	const contractExecSign1 = await contractExecTx1.sign(alicePrivateKey);
	const contractExecSubmit1 = await contractExecSign1.execute(client);
	const contractExecRx1 = await contractExecSubmit1.getReceipt(client);
	console.log(`- Token association with Alice's account: ${contractExecRx1.status.toString()} \n`);

	//Execute a contract function (transfer)
	const contractExecTx2 = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction(
			"tokenTransfer",
			new ContractFunctionParameters()
				.addAddress(operatorId.toSolidityAddress())
				.addAddress(aliceAcountId.toSolidityAddress())
				.addInt64(50)
		)
		.setMaxTransactionFee(new Hbar(2))
		.freezeWith(client);
	const contractExecSign2 = await contractExecTx2.sign(operatorKey);
	const contractExecSubmit2 = await contractExecSign2.execute(client);
	const contractExecRx2 = await contractExecSubmit2.getReceipt(client);

	console.log(`- Token transfer from Treasury to Alice: ${contractExecRx2.status.toString()}`);

	tB = await bCheckerFcn(operatorId);
	aB = await bCheckerFcn(aliceAcountId);
	console.log(`- Treasury balance: ${tB} units of token: ${tokenId}`);
	console.log(`- Alice balance: ${aB} units of token: ${tokenId} \n`);

	// ========================================
	// FUNCTIONS

	async function tQueryFcn(tId) {
		return new TokenInfoQuery().setTokenId(tId).execute(client);
	}

	async function bCheckerFcn(aId) {
		let balanceCheckTx = await new AccountBalanceQuery().setAccountId(aId).execute(client);
		return balanceCheckTx.tokens._map.get(tokenId.toString());
	}
}
main();
