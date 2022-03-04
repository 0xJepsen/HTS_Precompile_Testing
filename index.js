console.clear();
require("dotenv").config();
const {
	Client,
	AccountId,
	PrivateKey,
	TokenInfoQuery,
	AccountBalanceQuery,
	TokenCreateTransaction,
	FileCreateTransaction,
	FileAppendTransaction,
	Hbar,
	ContractCreateTransaction,
	ContractFunctionParameters,
	TokenUpdateTransaction,
	ContractExecuteTransaction,
	AccountCreateTransaction,
} = require("@hashgraph/sdk");
const fs = require("fs");


const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {

	// STEP 1 ===================================
	// Write, Compile, and get contract Bytecode
	// Our contract will mint Fungible tokens, Associate tokens, Transfer tokens
	const bytecode = fs.readFileSync("./contracts_Minting_sol_Minting.bin")
	console.log("----Finished Step 1----")

	// STEP 2 ===================================
	// Create a fungible token
	// set Admin, and supply keys
	const ourToken = await new TokenCreateTransaction()
		.setTokenName("Web3")
		.setTokenSymbol("W3")
		.setDecimals(0)
		.setInitialSupply(100)
		.setTreasuryAccountId(operatorId)
		.setAdminKey(operatorKey)
		.setSupplyKey(operatorKey)
		.freezeWith(client)
		.sign(operatorKey)

	const sumbitToken = await ourToken.execute(client)
	const tokenCreateReceipt = await sumbitToken.getReceipt(client)
	const tokenId = tokenCreateReceipt.tokenId
	const tokenIdSolidity = tokenId.toSolidityAddress()

	console.log("Token Id: ", tokenId.toString())
	console.log("As a sol address: ", tokenIdSolidity)
	// Token query 1

	const tokeninfo1 = await tQueryFcn(tokenId)
	console.log(`Supply of W3 token is: ${tokeninfo1.totalSupply.low}`)
	// Create a file on Hedera and store the hex-encoded bytecode

	const fileCreateTx = new FileCreateTransaction().setKeys([operatorKey])
	const fileCreateSubmit = await fileCreateTx.execute(client)
	const fileCreateReceipt = await fileCreateSubmit.getReceipt(client)
	const byteCodeFileId = fileCreateReceipt.fileId
	// Append contents to the file

	const fileAppend = new FileAppendTransaction()
		.setFileId(byteCodeFileId)
		.setContents(bytecode)
		.setMaxChunks(10)
		.setMaxTransactionFee(new Hbar(2))

	const fileAppendSubmit = await fileAppend.execute(client)
	const fileAppendReceipt = await fileAppendSubmit.getReceipt(client)

	console.log("response Code for file append was: ", fileAppendReceipt.status.toString())
	console.log("----Finished Step 2----")

	// STEP 3 ===================================
	// Create the smart contract
	const contractCreateTx = new ContractCreateTransaction()
		.setBytecodeFileId(byteCodeFileId)
		.setGas(3000000)
		.setConstructorParameters(new ContractFunctionParameters()
			.addAddress(tokenIdSolidity))

	const contractCreateSubmit = await contractCreateTx.execute(client)
	const contractCreateReceipt = await contractCreateSubmit.getReceipt(client)

	const contractId = contractCreateReceipt.contractId
	const contractIdSolidity = contractId.toSolidityAddress()

	console.log("Contract ID: ", contractId.toString())
	console.log("Contract Sol address: ", contractIdSolidity)

	// Token query 2 to show the suply key
	const tokeninfo2 = await tQueryFcn(tokenId)
	console.log("Token Supply key is: ", tokeninfo2.supplyKey.toString())

	// Update the fungible token so the smart contract manages the supply
	const tokenUpdateTx = await new TokenUpdateTransaction()
		.setTokenId(tokenId)
		.setSupplyKey(contractId)
		.freezeWith(client)
		.sign(operatorKey)

	const tokenUpdateSubmit = await tokenUpdateTx.execute(client)
	const tokenUpdateReceipt = await tokenUpdateSubmit.getReceipt(client)

	console.log("The token update transaction was a ", tokenUpdateReceipt.status.toString())

	const tokeninfo3 = await tQueryFcn(tokenId)
	console.log("Token Supply key is: ", tokeninfo3.supplyKey.toString())
	console.log("----Finished Step 3----")

	// STEP 4 ===================================
	// Execute a contract function (mint)

	const contractMint = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("mintFungibleToken", new ContractFunctionParameters().addUint64(100))
		.setMaxTransactionFee(new Hbar(2))

	const contractMintExecute = await contractMint.execute(client)
	const contractMintReceipt = await contractMintExecute.getReceipt(client)

	console.log("Contract Mint was a ", contractMintReceipt.status.toString())

	const tokeninfo4 = await tQueryFcn(tokenId)
	console.log("Token Supply key is: ", tokeninfo4.totalSupply.low)
	
	// Execute a contract function (associate)

	const alicePrivateKey = PrivateKey.generateECDSA()
	const alicePublicKey  = alicePrivateKey.publicKey

	const accountCreateTx = await new AccountCreateTransaction()
		.setKey(alicePrivateKey)
		.execute(client)

	const aliceAccountCreateReceipt = await accountCreateTx.getReceipt(client)
	const aliceAccountId = aliceAccountCreateReceipt.accountId
	const aliceSol = aliceAccountId.toSolidityAddress()

	const contractAssociateTx = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("tokenAssociate", new ContractFunctionParameters()
			.addAddress(aliceSol))
		.freezeWith(client)
		.sign(alicePrivateKey)

	const contractAssociateSubmit = await contractAssociateTx.execute(client)
	const contractAssociateReceipt = await contractAssociateSubmit.getReceipt(client)

	console.log("The contract Associate with allice was a ", contractAssociateReceipt.status.toString())
	// Execute a contract function (transfer)

	// check balances

	// ========================================
	// console.log("---Finished Step 4---")
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
