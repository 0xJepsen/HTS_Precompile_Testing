console.clear();
require("dotenv").config();
const {
	Client,
	AccountId,
	PrivateKey,
	TokenInfoQuery,
	TokenCreateTransaction,
	AccountBalanceQuery,
	FileAppendTransaction,
	FileCreateTransaction,
	Hbar,
	ContractCreateTransaction,
	ContractFunctionParameters,
	TokenUpdateTransaction,
	ContractExecuteTransaction,
	AccountCreateTransaction
} = require("@hashgraph/sdk");
const fs = require("fs");

const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	// STEP 1 ===================================
	// Write, Compile, and get contract Bytecode
	// Our contract will mint Fungible tokens, Associate tokens, Transfer tokens
	const byteCode = fs.readFileSync("./contracts_Minting_sol_Minting.bin")
	console.log("----Finished Step 1----")

	// STEP 2 ===================================
	// Create a fungible token
	const ourToken = await new TokenCreateTransaction()
		.setTokenName("MainCoon")
		.setTokenSymbol("MC")
		.setDecimals(0)
		.setInitialSupply(100)
		.setTreasuryAccountId(operatorId)
		.setAdminKey(operatorKey)
		.setSupplyKey(operatorKey)
		.freezeWith(client)
		.sign(operatorKey)
	const submitToken = await ourToken.execute(client)
	const tokenCreateReceipt = await submitToken.getReceipt(client)
	const tokenId = tokenCreateReceipt.tokenId
	const tokenAddressSolidity = tokenId.toSolidityAddress()

	console.log("Token Id is: ", tokenId.toString())
	console.log("Token Solidity Address is: ", tokenAddressSolidity)
	// set Admin, and supply keys
	// Token query 1

	const tokenInfo1 = await tQueryFcn(tokenId);
	console.log(`Supply MC token is: ${tokenInfo1.totalSupply.low}\n`)

	const fileCreateTx = new FileCreateTransaction().setKeys([operatorKey])
	const fileCreateSubmit = await fileCreateTx.execute(client)
	const fileCreateReceipt = await fileCreateSubmit.getReceipt(client)
	const byteCodeFileId = fileCreateReceipt.fileId

	console.log("File Id is: ", byteCodeFileId.toString())
	// Create a file on Hedera and store the hex-encoded bytecode
	// Append contents to the file
	const fileAppendTx = new FileAppendTransaction()
		.setFileId(byteCodeFileId)
		.setContents(byteCode)
		.setMaxChunks(10)
		.setMaxTransactionFee(new Hbar(2))

	const fileAppendSubmit = await fileAppendTx.execute(client)
	const fileAppendReceipt = await fileAppendSubmit.getReceipt(client)

	console.log("Response code was: ", fileAppendReceipt.status.toString())
	console.log("----Finished Step 2----")
	// STEP 3 ===================================

	const contractCreateTx = new ContractCreateTransaction()
		.setBytecodeFileId(byteCodeFileId)
		.setGas(3000000)
		.setConstructorParameters( 
			new ContractFunctionParameters()
				.addAddress(tokenAddressSolidity))

	const contractCreateSubmit = await contractCreateTx.execute(client)
	const contractCreateReceipt = await contractCreateSubmit.getReceipt(client)

	const contractId = contractCreateReceipt.contractId
	const contractIdSolidity = contractId.toSolidityAddress()

	console.log("Contract id is: ", contractId.toString())
	console.log("Contract Solidity Address is: ", contractIdSolidity)
	// Create the smart contract
	// Token query 2 to show the suply key
	
	const tokenInfo2 = await tQueryFcn(tokenId)
	console.log("Token Supply key is: ", tokenInfo2.supplyKey.toString())

	const tokenUpdateTx = await new TokenUpdateTransaction()
		.setTokenId(tokenId)
		.setSupplyKey(contractId)
		.freezeWith(client)
		.sign(operatorKey)
	
	const tokenUpdateSubmit = await tokenUpdateTx.execute(client)
	const tokenUpdateReceipt = await tokenUpdateSubmit.getReceipt(client)

	console.log("The token update was a: ", tokenUpdateReceipt.status.toString())
	const tokenInfo3 = await tQueryFcn(tokenId)
	console.log("The new supply key is: ", tokenInfo3.supplyKey.toString())

	// Update the fungible token so the smart contract manages the supply
	// Token query 3
	console.log("----Finished Step 3----")

	// STEP 4 ===================================
	// Execute a contract function (mint)

	const contractMint = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("mintFungibleToken", 
			new ContractFunctionParameters().addUint64(100))
		.setMaxTransactionFee(new Hbar(2))

	const contractMintExecute = await contractMint.execute(client)
	const contractMintReceipt = await contractMintExecute.getReceipt(client)

	console.log("The contract mint was a ", contractMintReceipt.status.toString())

	const tokenInfo4 = await tQueryFcn(tokenId)
	console.log("Token Supply is: ", tokenInfo4.totalSupply.low)
	// Token query to check the supply
	// create alice acount to test associate

	const alicePrivateKey = PrivateKey.generateECDSA()
	const alicePublicKey = alicePrivateKey.publicKey

	const aliceCreateAccountTx = await new AccountCreateTransaction()
		.setKey(alicePrivateKey)
		.execute(client)

	const aliceAccountCreateReceipt = await aliceCreateAccountTx.getReceipt(client)
	const aliceAccountID = aliceAccountCreateReceipt.accountId

	// Execute a contract function (associate)

	const contractAssociateTx = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("tokenAssociate", new ContractFunctionParameters().addAddress(aliceAccountID.toSolidityAddress()))
		.setMaxTransactionFee(new Hbar(2))
		.freezeWith(client)

	const contractAssociateSigned = await contractAssociateTx.sign(alicePrivateKey)
	const contractAssociateExecute = await contractAssociateSigned.execute(client)
	const contractAssociateReceipt = await contractAssociateExecute.getReceipt(client)
	console.log("The token associate was a ", contractAssociateReceipt.status.toString())
	// Execute a contract function (transfer)

	const contractTransferTx = await new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(3000000)
		.setFunction("tokenTransfer", 
		new ContractFunctionParameters()
			.addAddress(operatorId.toSolidityAddress())
			.addAddress(aliceAccountID.toSolidityAddress())
			.addInt64(100))
		.setMaxTransactionFee(new Hbar(2))
		.freezeWith(client)

	const signedContractTransfer = await contractTransferTx.sign(operatorKey)
	const submitedContractTransfer = await signedContractTransfer.execute(client)
	const contractTranferReceipt = await submitedContractTransfer.getReceipt(client)

	console.log("The contract tranfer was a ", contractTranferReceipt.status.toString())

	// check balances
	const treasuryAccount = await bCheckerFcn(operatorId)
	const aliceAccount = await bCheckerFcn(aliceAccountID)

	console.log(`Treasury Account Balance: ${treasuryAccount} of token ${tokenId}`)
	console.log(`Treasury Account Balance: ${aliceAccount} of token ${tokenId}`)

	// ========================================
	console.log("---Finished Step 4---")
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
