const { Client, TokenCreateTransaction, ContractCreateTransaction, FileCreateTransaction, FileId, Hbar, PrivateKey, ContractCallQuery, ContractFunctionParameters, ContractExecuteTransaction, AccountId, AccountBalanceQuery } = require("@hashgraph/sdk");
require("dotenv").config();

async function main () {

    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    const client = Client.forPreviewnet();

    client.setOperator(myAccountId, myPrivateKey)

    const myBalance = await new AccountBalanceQuery()
        .setAccountId(myAccountId)
        .execute(client)

    console.log("My balance", myBalance.toString())
}
main()