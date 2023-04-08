// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__PriceMustBeGreaterThanZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress , uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NftIsNotListed(address nftAddress , uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceedsToWithdraw(address owner);
error NftMarketplace__WithdrawFailed();

contract NftMarketplace is ReentrancyGuard{

    struct Listing {
        uint256 price;
        address seller;
    }
    mapping (address => mapping (uint256 => Listing)) private s_listings; 

    mapping (address => uint256) private s_proceeds;

    //////////////////////
    ////    events    ////
    //////////////////////

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemList(
        address indexed lister ,
        address indexed nftAddress , 
        uint256 tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed nftAddress , 
        uint256 indexed tokenId , 
        address indexed owner
    );

    event ListedItemUpdated(
        address indexed nftAddress,
        address indexed seller,
        uint256 tokenId,
        uint256 newPrice
    );

    //////////////////////
    ////   Modifiers   ///
    //////////////////////

    modifier notListed(
        address nftAddress , 
        uint256 tokenId , 
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0){
            revert NftMarketplace__AlreadyListed(nftAddress,tokenId);
        }
        _;
    }

    modifier isListed(
        address nftAddress,
        uint256 tokenId
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NftIsNotListed(nftAddress,tokenId);
        }
        _;       
    }

    modifier isOwner(
        address nftAddress ,
        uint256 tokenId ,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    //////////////////////
    ////Main Functions ///
    //////////////////////

    // List an item ________________________________________________________________________________________________________________

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
        )  external 
        notListed(nftAddress , tokenId,msg.sender) 
        isOwner(nftAddress , tokenId , msg.sender)
        {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeGreaterThanZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price , msg.sender);
        emit ItemList(msg.sender, nftAddress , tokenId , price);
    }

    // Buy an item ________________________________________________________________________________________________________________

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable 
    isListed(nftAddress , tokenId)
    nonReentrant()
    {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if(msg.value < listedItem.price){
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
    s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + msg.value;
    delete (s_listings[nftAddress][tokenId]);
    IERC721(nftAddress).safeTransferFrom(listedItem.seller , msg.sender , tokenId);
    emit ItemBought(msg.sender , nftAddress ,tokenId ,listedItem.price);
    }

    // Cancel listing an item ________________________________________________________________________________________________________________

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
    isListed(nftAddress , tokenId)
    isOwner(nftAddress , tokenId , msg.sender)
    external {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(nftAddress,tokenId,msg.sender);
    }

    // Update listing an item ________________________________________________________________________________________________________________

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external
    isOwner(nftAddress, tokenId , msg.sender)
    isListed(nftAddress,tokenId)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ListedItemUpdated(nftAddress,msg.sender,tokenId,newPrice);
    }

    // Withdraw all the proceeds ________________________________________________________________________________________________________________

    function withdrawProceeds() external{
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceedsToWithdraw(msg.sender);
        }
        s_proceeds[msg.sender] = 0;
        (bool success ,  ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__WithdrawFailed();
        }
    }


    //////////////////////
    ////    Getters   ////
    //////////////////////

    function getListing(address nftAddress , uint256 tokenId) external view returns (Listing memory){
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256){
        return s_proceeds[seller];
    }


}