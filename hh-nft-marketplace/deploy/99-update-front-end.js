const {ethers,network} = require("hardhat")
const {networks} = require("../hardhat.config")
require("dotenv").config()
const fs = require("fs")

const frontEndContractFile = "../frontend-moralis/constants/networkMapping.json"

module.exports = async()=> {
    if (process.env.UPDATE_FRONT_END) {
        console.log("updating front end ... ")
        await updateContractAddresses()
    }
}

const updateContractAddresses = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const chainName = network.name
    console.log(chainName)
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractFile,"utf8"))
    console.log(contractAddresses)
    if (chainName in contractAddresses) {
        if(!contractAddresses[chainName]["NftMarketplace"].includes(nftMarketplace.address)){
            contractAddresses[chainName]["NftMarketplace"].push(nftMarketplace.address)
        }
    } else {
        contractAddresses[chainName]={"NftMarketplace" : [nftMarketplace.address]}
    }
    fs.writeFileSync(frontEndContractFile, JSON.stringify(contractAddresses) , "utf8")
}

module.exports.tags = ["all" , "frontend"]