const {network, ethers} = require("hardhat")
const {networkConfig , developmentChains} = require("../helper-hardhat-config")
const {verify} = require("../utils/verify")
require("dotenv").config()


module.exports = async ({getNamedAccounts , deployments}) => {
    const {deployer} = await getNamedAccounts()
    const {deploy,log} = await deployments
    let args = []
    const nftMarketplace = await deploy("NftMarketplace", {
        from:deployer,
        args:args,
        log:true,
        waitConfirmations:network.config.blockConfirmation || 1 
    })

    if (!developmentChains.includes(network.name)&& process.env.ETHERSCAN_API_KEY){
        console.log("Verifying . . .")
        await verify(nftMarketplace.address , args)
    }

    console.log("____________________________________________________________________________________");

}

module.exports.tags = ["all","nftmarketplace"]