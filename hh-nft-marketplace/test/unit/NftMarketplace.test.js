const {assert , expect} = require("chai")
const {network, deployments , ethers, getNamedAccounts} = require("hardhat")
const {networkConfig, developmentChains} = require("../../helper-hardhat-config")


!developmentChains.includes(network.name) ? describe.skip 
: describe("Nft Marketplace Tests" , () => {
    let nftMarketplace , basicNft,deployer,player
    const LOW_PRICE = ethers.utils.parseEther("0.01")
    const PRICE = ethers.utils.parseEther("0.1")
    const UPDATING_PRICE = ethers.utils.parseEther("0.2")
    const ZERO_ETHER = ethers.utils.parseEther("0")
    const TOKEN_ID = 0
    beforeEach(async  () =>{
        deployer = (await getNamedAccounts()).deployer
        // player = (await getNamedAccounts()).player
        const accounts = await ethers.getSigners()
        player = accounts[1]
        await deployments.fixture(["all"])
        nftMarketplace = await ethers.getContract("NftMarketplace")
        basicNft = await ethers.getContract("BasicNft")
        await basicNft.mintNft()
        await basicNft.approve(nftMarketplace.address , TOKEN_ID)
    })

    describe("buyItem" , () => {
        it("lists and can be bought", async ()=> {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await playerConnectedNftMarketplace.buyItem(basicNft.address , TOKEN_ID,{value:PRICE})
            const newOwner = await basicNft.ownerOf(TOKEN_ID)
            const deployerProceeds = await nftMarketplace.getProceeds(deployer)
            assert(newOwner.toString() == player.address, "ownership transmission failed")
            assert(deployerProceeds.toString() ==  PRICE.toString())
        })

        it("reverts when price not met", async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await expect(playerConnectedNftMarketplace.buyItem(basicNft.address , TOKEN_ID,{value:LOW_PRICE})).to.be.reverted
        })

        it("emits an event of buying the nft" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            expect(await playerConnectedNftMarketplace.buyItem(basicNft.address , TOKEN_ID,{value:PRICE})).to.emit("ItemBought")
        })
    })

    describe("listItem" , () => {
        it("can list any item" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const listedItem = await nftMarketplace.getListing(basicNft.address,TOKEN_ID)
            assert(listedItem.price.toString() == PRICE.toString(),"item not listed")
        })
        it("reverts an error when you put zero on the price", async () => { 
            await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID , ZERO_ETHER)).to.be.revertedWith("NftMarketplace__PriceMustBeGreaterThanZero")
        })
        it("reverts an error if the seller is not the owner" , async() => {
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await expect(playerConnectedNftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)).to.be.reverted
        })
        it("emits an event of listing" , async () => {
            expect(await nftMarketplace.listItem(basicNft.address,TOKEN_ID, PRICE)).to.emit("ItemList")
        })
        it("reverts if the nft is already listed" , async() => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            await expect(nftMarketplace.listItem(basicNft.address,TOKEN_ID,PRICE)).to.be.reverted
        })
    })

    describe("cancelListing" , () => {
        it("can cancel the listing of an item" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const listedItem = await nftMarketplace.getListing(basicNft.address,TOKEN_ID)
            assert(listedItem.price.toString() == PRICE.toString(),"item not listed")
            await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
            const NonListedItem = await nftMarketplace.getListing(basicNft.address,TOKEN_ID)
            assert(NonListedItem.price == 0,"canceling from the list failed")
        })
        it("reverts if the canceler is not the owner" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await expect(playerConnectedNftMarketplace.cancelListing(basicNft.address,TOKEN_ID)).to.be.reverted
        })
        it("reverts an error if the nft is not listed" , async () => {
            await expect(nftMarketplace.cancelListing(basicNft.address,TOKEN_ID)).to.be.reverted
        } )
        it("emits an event when canceling the listing" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            expect(await nftMarketplace.cancelListing(basicNft.address,TOKEN_ID)).to.emit("ItemCanceled")
        })
    })

    describe("updateListing" , async()=> {
        it("updates the price of an item" , async () => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const listedItem = await nftMarketplace.getListing(basicNft.address,TOKEN_ID)
            assert(listedItem.price.toString() == PRICE.toString(),"item not listed")
            await nftMarketplace.updateListing(basicNft.address , TOKEN_ID , UPDATING_PRICE)
            const updatedItem  = await nftMarketplace.getListing(basicNft.address,TOKEN_ID)
            assert(updatedItem.price.toString() == UPDATING_PRICE.toString(), "listed item was not updated")
        })
        it("reverts an error if the nft is not listed" , async () =>{
            await expect(nftMarketplace.updateListing(basicNft.address,TOKEN_ID,UPDATING_PRICE)).to.be.reverted
        } )
        it("reverts an error if the updater is not the owner", async() => {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID , PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await expect(playerConnectedNftMarketplace.updateListing(basicNft.address,TOKEN_ID,UPDATING_PRICE)).to.be.reverted
        })
        it("emits an event when the listing is updated", async() => {
            await nftMarketplace.listItem(basicNft.address,TOKEN_ID,PRICE)
            expect(await nftMarketplace.updateListing(basicNft.address,TOKEN_ID,UPDATING_PRICE)).to.emit("ListedItemUpdated")
        })
    })

    describe("withdrawProceeds" , () => {
        it("withdraws proceeds", async function () {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
            const playerConnectedNftMarketplace = nftMarketplace.connect(player)
            await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
            nftMarketplace = nftMarketplace.connect(deployer)
            const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer)
            deployer = (await ethers.getSigners())[0]
            // const deployerBalanceBefore = await deployer.getBalance()
            // const txResponse = await nftMarketplace.withdrawProceeds()
            // const transactionReceipt = await txResponse.wait(1)
            // const { gasUsed, effectiveGasPrice } = transactionReceipt
            // const gasCost = gasUsed.mul(effectiveGasPrice)
            // const deployerBalanceAfter = await deployer.getBalance()

            // assert(
            //     deployerBalanceAfter.add(gasCost).toString() ==
            //         deployerProceedsBefore.add(deployerBalanceBefore).toString()
            // )
        })
    })
})