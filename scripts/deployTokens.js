import * as dotenv from "dotenv";
require('dotenv').config();
dotenv.config({ path: "./.env.local" });
import { getAlgodClient } from "../src/clients/index.js";
//import algosdk from "algosdk";
const algosdk = require("algosdk");
import * as algotxns from "../src/algorand/index.js";


const network = process.env.NEXT_PUBLIC_NETWORK || "TestNet";
const algodClient = getAlgodClient(network);

// get creator and buyer account
const deployer = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC);
const buyer = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_BUYER_MNEMONIC);
const creator = deployer;
const receiver = buyer;
//print out the deployer and buyer address to check
console.log("deployer: " + process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC);
console.log(deployer);
console.log("buyer: " + process.env.NEXT_PUBLIC_BUYER_MNEMONIC);
console.log(buyer);



const createAsset = async (maker, clawbackAcc) => {
  const total = 10; // how many of this asset there will be
  const decimals = 0; // units of this asset are whole-integer amounts
  const assetName = "nftASA";
  const unitName = "nft";
  const url = "ipfs://cid";
  const metadata = undefined;
  const defaultFrozen = false; // whether accounts should be frozen by default

  console.log("maker: " + maker.addr);
  console.log(maker);
  
  // create suggested parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  console.log("maker again: " + maker.addr);
  console.log(maker);

  // create the asset creation transaction
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: maker.addr,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: url,
    assetMetadataHash: metadata,
    defaultFrozen,
    freeze: undefined,
    manager: undefined,
    clawback: undefined,
    reserve: undefined,

    suggestedParams,
  });

  console.log("maker again again: " + maker.addr);
  console.log(maker);

  // sign the transaction
  const signedTxn = txn.signTxn(maker.sk);

  return await submitToNetwork(signedTxn);
};

// const sendAlgos = async (sender, receiver, amount) => {
//   // create suggested parameters
//   const suggestedParams = await algodClient.getTransactionParams().do();

//   let txn = algosdk.makePaymentTxnWithSuggestedParams(
//     sender.addr,
//     receiver.addr,
//     amount,
//     undefined,
//     undefined,
//     suggestedParams
//   );

//   // sign the transaction
//   const signedTxn = txn.signTxn(sender.sk);

//   const confirmedTxn = await submitToNetwork(signedTxn);
// };



const submitToNetwork = async (signedTxn) => {
  // send txn
  let tx = await algodClient.sendRawTransaction(signedTxn).do();
  console.log("Transaction : " + tx.txId);

  // Wait for transaction to be confirmed
  confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

  //Get the completed Transaction
  console.log(
    "Transaction " +
    tx.txId +
    " confirmed in round " +
    confirmedTxn["confirmed-round"]
  );

  return confirmedTxn;
};




(async () => {
  // write your code here


  //Create assets


  // Fund accounts
  //console.log("Funding accounts...");
  //await sendAlgos(creator, receiver, 1e6); // 1 Algo
  //await sendAlgos(creator, clawbackTo, 1e6); // 1 Algo

  //const DeployerCreateAssets = await algotxns.createAsset(algodClient, deployer);
  console.log("creator: " + creator.addr);
  console.log(creator);
  const newAssets = await createAsset(creator, creator);
  const assetId = newAssets["asset-index"];
  console.log(`Token already created. Aseet Id is ${assetId}`);

  const suggestedParams = await algodClient.getTransactionParams().do();


  // Buyer opts into asset
  console.log("Buyer opts into asset...");
  let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    receiver.addr,
    receiver.addr,
    undefined,
    undefined,
    0,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn1 = txn1.signTxn(receiver.sk);
  await submitToNetwork(signedTxn1);


  // Send asset
  console.log("Sending asset to buyer...");
  let txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    creator.addr,
    receiver.addr,
    undefined,
    undefined,
    100,
    undefined,
    assetId,
    suggestedParams
  );
  let signedTxn2 = txn2.signTxn(creator.sk);
  await submitToNetwork(signedTxn2);

  // Check your work
  console.log("Receiver assets: ", (await algodClient.accountInformation(receiver.addr).do()).assets);

})();
