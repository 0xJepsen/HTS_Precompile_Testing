const { Client, TokenCreateTransaction, ContractCreateTransaction, FileCreateTransaction, FileId, Hbar, PrivateKey, ContractCallQuery, ContractFunctionParameters, ContractExecuteTransaction } = require("@hashgraph/sdk");
require("dotenv").config();
const json = require('./Artifacts/FundMe.json');

async function main () {

    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    } else console.log("Environment variables configured Succesfully")
    console.log("Account ID is: ",myAccountId)

    const client = Client.forPreviewnet();

    client.setOperator(myAccountId, myPrivateKey)

    const token = await new TokenCreateTransaction()
        .setTokenName("HTS Testing")
        .setTokenSymbol("HTS")
        .setTreasuryAccountId(myAccountId)
        .setDecimals(4)
        .setInitialSupply(5000)
        .execute(client);

    const TokenReceipt = await token.getReceipt(client)
    const tokenID = TokenReceipt.tokenId
    console.log("Token ID is: ", tokenID)
    
    const compiled = json['data']['bytecode']['object'];
    // Store Contact in file service. Different from eth. Transaction size is smaller on hedera for security 
    const mycontract = await new FileCreateTransaction()
        .setContents(compiled)
        .setKeys([PrivateKey.fromString(myPrivateKey)])
        // The default max fee of 1 HBAR is not enough to make a file ( starts around 1.1 HBAR )
        .setMaxTransactionFee(new Hbar(2)) // 2 HBAR
        .execute(client);
    
    const TransactionReceipt  = await mycontract.getReceipt(client);
    const fileid =  new FileId(TransactionReceipt.fileId);
    console.log("file ID: " + fileid);
    // Deploy Contract
    const deploy = await new ContractCreateTransaction()
        .setGas(300)
        .setBytecodeFileId(fileid)
        .setConstructorParameters(new ContractFunctionParameters()
            .addAddress(tokenID.toSolidityAddress()))
        .execute(client);

    const receipt = await deploy.getReceipt(client); //Get the new contract 
    const newContractId = receipt.contractId;        
    console.log("The contract ID is " + newContractId);

    // const setter = await new ContractExecuteTransaction()
    //     .setContractId(newContractId)
    //     .setGas(400000)
    //     .setFunction("set", new ContractFunctionParameters().addUint256(7))
    //     .setMaxTransactionFee(new Hbar(3))

    // see input protobuff being sent by this ContractExecuteTransaction
    // console.log(JSON.stringify(setter._makeTransactionBody()))
    // const contractCallResult = await setter.execute(client);
    // const testing = await contractCallResult.getReceipt(client);
    // console.log("Status Code:", testing.status)
    // //console.log(JSON.stringify(testing))

    // const getter = await new ContractCallQuery() // 
    //     .setContractId(newContractId)
    //     .setFunction("get")
    //     .setGas(300000)
    //     .setMaxQueryPayment(new Hbar(1)) // defaults to 1, if requires more than one need change

    // const contractGetter = await getter.execute(client);
    // const message = await contractGetter.getUint256(0);
    // console.log("contract message: " + message);
}
main();