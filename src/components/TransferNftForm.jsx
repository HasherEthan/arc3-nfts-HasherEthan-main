import { useWallet } from "@txnlab/use-wallet";
import { useState } from "react";
import { getAlgodClient } from "../clients";
import Button from "./Button";
import NftItem from "./NftItem";
import { useEffect, useState } from "react";
import * as algotxn from "@/algorand";
import * as algotxns from "../src/algorand/index.js";
import algosdk from "algosdk";

const network = process.env.NEXT_PUBLIC_NETWORK || "TestNet";
const buyerAddr = process.env.NEXT_PUBLIC_BUYER_ADDR;
const deployerAddr = process.env.NEXT_PUBLIC_DEPLOYER_ADDR;
const tokenAssetId = process.env.NEXT_PUBLIC_ALGOD_TOKEN_TESTNET;
//const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
//const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_API_SECRET;
const algod = getAlgodClient(network);

export default function TransferNFTForm() {
  const { activeAddress, signTransactions, sendTransactions } = useWallet();
  const [assetFile, setAssetFile] = useState(null);
  const [txnref, setTxnRef] = useState("");
  const [txnUrl, setTxnUrl] = useState("");

  const getTxnRefUrl = (txId) => {
    if (network === "SandNet") {
      return `https://app.dappflow.org/explorer/transaction/${txId}`;
    } else if (network === "TestNet") {
      return `https://testnet.algoexplorer.io/tx/${txId}`;
    }

    return "";
  }

  const handleFileChange = async (e) => {
    setAssetFile(e.target.files[0]);
  }


  // const uploadAssetToPinata = async (asset, desc, file) => {
    
  //   const assetData = new FormData();
  //   assetData.append('file', file);

  //   const fileUpload = await axios.post(`https://api.pinata.cloud/pinning/pinFileToIPFS`, assetData, {
  //     maxContentLength: 'Infinity',
  //     headers: {
  //       'Content-Type': `multipart/form-data; boundary=${assetData._boundary}`,
  //       pinata_api_key: pinataApiKey,
  //       pinata_secret_api_key: pinataSecretApiKey
  //     }
  //   });

  //   const metadata = {
  //     "name": asset,
  //     "description": desc,
  //     "image": `ipfs://${fileUpload.data.IpfsHash}`,
  //     "image_mimetype": file.type,
  //   }

  //   const metaDataPin = await axios.post(`https://api.pinata.cloud/pinning/pinJSONToIPFS`, metadata, {
  //     headers: {
  //       'Content-Type': 'application/json',
  //       pinata_api_key: pinataApiKey,
  //       pinata_secret_api_key: pinataSecretApiKey,
  //     },
  //   });
  //   return `ipfs://${metaDataPin.data.IpfsHash}#arc3`;
  // }



  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   const assetName = e.target["asset-name"].value;
  //   const desc = e.target["description"].value;
  //   console.log(assetName, desc, assetFile);

  //   // write your code here to mint NFT
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const assetName = e.target["asset-name"].value;
    const desc = e.target["description"].value;
    console.log(assetName, desc, assetFile);

    // your code here

    const metadataHash = await algotxns.uploadAssetToPinata(assetName, desc, assetFile);
    const params = await algod.getTransactionParams().do();

    // transfer 5 tokens to mint
    const feeTxns = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: buyerAddr,
      to: deployerAddr,
      amount: 5,
      assetIndex: parseInt(tokenAssetId),
      suggestedParams: params,
    });


    const assetCreateTxns = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: buyerAddr,
      total: 1,
      decimals: 0,
      assetName: assetName,
      unitName: "what-NFT",
      assetURL: `ipfs://${metadataHash}#arc3`,
      assetMetadataHash: undefined,
      defaultFrozen: false,
      manager: deployerAddr,
      suggestedParams: params,
    });


    algosdk.assignGroupID([feeTxns, assetCreateTxns]);
    const deployer = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC);
    const buyer = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_BUYER_MNEMONIC);

    const signedFeeTxns = feeTxns.signTxn(buyer.sk);
    const signedAssetCreateTxns = assetCreateTxns.signTxn(buyer.sk);

    const { txId } = await algod.sendRawTransaction([signedFeeTxns, signedAssetCreateTxns]).do();
    console.log(`Fee transfered at: ${txId}`);

    await algosdk.waitForConfirmation(algod, txId, 4);


  };





  return (
    <div className="w-full">
      {activeAddress && txnref && (
        <p className="mb-4 text-left">
          <a href={txnUrl} target="_blank" className="text-blue-500">
            Tx ID: {txnref}
          </a>
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4 w-full">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="asset-name">
            Asset Name:
          </label>
          <input type="text" id="asset-name" className="w-full" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description:
          </label>
          <textarea id="description" className="w-full" required></textarea>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Upload Image:
          </label>
          <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} required />
        </div>
        <Button label="Mint NFT" type="submit" />
      </form>
    </div>
  );
}
