import * as dotenv from "dotenv";
require('dotenv').config();
import algosdk from "algosdk";
import axios from "axios";
// import { getAlgodClient } from "../src/clients/index.js";

// mint tokens
const createAsset = async (maker, clawbackAcc) => {
    const total = 10000; // how many of this asset there will be
    const decimals = 0; // units of this asset are whole-integer amounts
    const assetName = "whatCoin";
    const unitName = "nft";
    const url = "ipfs://cid";
    const metadata = undefined;
    const defaultFrozen = false; // whether accounts should be frozen by default

    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

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
        clawback: clawbackAcc.addr,
        reserve: undefined,

        suggestedParams,
    });

    // sign the transaction
    const signedTxn = txn.signTxn(maker.sk);

    return await submitToNetwork(signedTxn);
};


//submit the operations onto the network
const submitToNetwork = async (algodClient, signedTxn) => {
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


// transfer algo to the buyer
const sendAlgos = async (sender, receiver, amount) => {
    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    let txn = algosdk.makePaymentTxnWithSuggestedParams(
        sender.addr,
        receiver.addr,
        amount,
        undefined,
        undefined,
        suggestedParams
    );

    // sign the transaction
    const signedTxn = txn.signTxn(sender.sk);

    const confirmedTxn = await submitToNetwork(signedTxn);
};


// upload asset to Pinata
const uploadAssetToPinata = async (asset, desc, file) => {

    const assetData = new FormData();
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_API_SECRET;
    assetData.append('file', file);

    const fileUpload = await axios.post(`https://api.pinata.cloud/pinning/pinFileToIPFS`, assetData, {
        maxContentLength: 'Infinity',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${assetData._boundary}`,
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey
        }
    });

    const metadata = {
        "name": asset,
        "description": desc,
        "image": `ipfs://${fileUpload.data.IpfsHash}`,
        "image_mimetype": file.type,
    }

    const metaDataPin = await axios.post(`https://api.pinata.cloud/pinning/pinJSONToIPFS`, metadata, {
        headers: {
            'Content-Type': 'application/json',
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
        },
    });
    return `ipfs://${metaDataPin.data.IpfsHash}#arc3`;
}

export { createAsset, submitToNetwork, sendAlgos, uploadAssetToPinata };
