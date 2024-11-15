const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomToken", function () {
    let CustomToken;
    let token;
    let admin;
    let minter;
    let user1;
    let user2;

    const TOKEN_NAME = "Test Token";
    const TOKEN_SYMBOL = "TST";
    const DECIMALS = 18;
    const INITIAL_MINT = ethers.utils.parseEther("1000");

    beforeEach(async function () {
        [admin, minter, user1, user2] = await ethers.getSigners();

        CustomToken = await ethers.getContractFactory("CustomToken");
        token = await CustomToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, DECIMALS);
        await token.deployed();

        // Add minter role
        await token.addMinter(minter.address);
    });

    describe("Access Control", function () {
        it("Should set the right admin", async function () {
            expect(await token.admin()).to.equal(admin.address);
        });

        it("Should allow admin to add minters", async function () {
            await token.connect(admin).addMinter(user1.address);
            expect(await token.authorizedMinters(user1.address)).to.be.true;
        });

        it("Should not allow non-admin to add minters", async function () {
            await expect(
                token.connect(user1).addMinter(user2.address)
            ).to.be.revertedWith("AccessControl: caller is not admin");
        });

        it("Should allow admin to remove minters", async function () {
            await token.connect(admin).removeMinter(minter.address);
            expect(await token.authorizedMinters(minter.address)).to.be.false;
        });

        it("Should allow admin to change admin", async function () {
            await token.connect(admin).changeAdmin(user1.address);
            expect(await token.admin()).to.equal(user1.address);
        });

        it("Should not allow zero address as admin", async function () {
            await expect(
                token.connect(admin).changeAdmin(ethers.constants.AddressZero)
            ).to.be.revertedWith("AccessControl: new admin is zero address");
        });
    });

    describe("Minting Functionality", function () {
        it("Should allow authorized minter to mint tokens", async function () {
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
            expect(await token.balanceOf(user1.address)).to.equal(INITIAL_MINT);
        });

        it("Should not allow unauthorized addresses to mint", async function () {
            await expect(
                token.connect(user1).mint(user2.address, INITIAL_MINT)
            ).to.be.revertedWith("AccessControl: caller is not minter");
        });

        it("Should emit Mint and Transfer events", async function () {
            await expect(token.connect(minter).mint(user1.address, INITIAL_MINT))
                .to.emit(token, "Mint")
                .withArgs(user1.address, INITIAL_MINT)
                .and.to.emit(token, "Transfer")
                .withArgs(ethers.constants.AddressZero, user1.address, INITIAL_MINT);
        });

        it("Should update total supply after minting", async function () {
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
            expect(await token.totalSupply()).to.equal(INITIAL_MINT);
        });
    });

    describe("Burning Functionality", function () {
        beforeEach(async function () {
            // Mint some tokens to user1 for burning tests
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
        });

        it("Should allow admin to burn tokens", async function () {
            const burnAmount = ethers.utils.parseEther("100");
            await token.connect(admin).burn(user1.address, burnAmount);
            expect(await token.balanceOf(user1.address)).to.equal(INITIAL_MINT.sub(burnAmount));
        });

        it("Should not allow non-admin to burn tokens", async function () {
            await expect(
                token.connect(user2).burn(user1.address, INITIAL_MINT)
            ).to.be.revertedWith("AccessControl: caller is not admin");
        });

        it("Should not allow burning more than balance", async function () {
            const tooMuch = INITIAL_MINT.add(ethers.utils.parseEther("1"));
            await expect(
                token.connect(admin).burn(user1.address, tooMuch)
            ).to.be.revertedWith("CustomToken: burn amount exceeds balance");
        });
    });

    describe("Regular User Functions", function () {
        beforeEach(async function () {
            // Setup initial balances
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
        });

        it("Should allow users to check balances", async function () {
            expect(await token.balanceOf(user1.address)).to.equal(INITIAL_MINT);
            expect(await token.balanceOf(user2.address)).to.equal(0);
        });

        it("Should allow users to transfer tokens", async function () {
            const transferAmount = ethers.utils.parseEther("100");
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
            expect(await token.balanceOf(user1.address)).to.equal(INITIAL_MINT.sub(transferAmount));
        });

        it("Should allow users to approve spending", async function () {
            const approvalAmount = ethers.utils.parseEther("100");
            await token.connect(user1).approve(user2.address, approvalAmount);
            expect(await token.allowance(user1.address, user2.address)).to.equal(approvalAmount);
        });

        it("Should allow transferFrom with approval", async function () {
            const transferAmount = ethers.utils.parseEther("100");
            await token.connect(user1).approve(user2.address, transferAmount);
            
            await token.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
            
            expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
            expect(await token.allowance(user1.address, user2.address)).to.equal(0);
        });

        it("Should not allow transfer without sufficient balance", async function () {
            const tooMuch = INITIAL_MINT.add(ethers.utils.parseEther("1"));
            await expect(
                token.connect(user1).transfer(user2.address, tooMuch)
            ).to.be.revertedWith("CustomToken: insufficient balance");
        });

        it("Should not allow transferFrom without approval", async function () {
            await expect(
                token.connect(user2).transferFrom(user1.address, user2.address, INITIAL_MINT)
            ).to.be.revertedWith("CustomToken: insufficient allowance");
        });
    });

    describe("Token Information", function () {
        it("Should return correct token information", async function () {
            const [name, symbol, decimals, supply] = await token.getTokenInfo();
            expect(name).to.equal(TOKEN_NAME);
            expect(symbol).to.equal(TOKEN_SYMBOL);
            expect(decimals).to.equal(DECIMALS);
            expect(supply).to.equal(0);
        });
    });

    describe("Events", function () {
        it("Should emit Transfer event on transfer", async function () {
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
            const transferAmount = ethers.utils.parseEther("100");
            
            await expect(token.connect(user1).transfer(user2.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);
        });

        it("Should emit Approval event on approve", async function () {
            const approvalAmount = ethers.utils.parseEther("100");
            await expect(token.connect(user1).approve(user2.address, approvalAmount))
                .to.emit(token, "Approval")
                .withArgs(user1.address, user2.address, approvalAmount);
        });

        it("Should emit AdminChanged event on admin change", async function () {
            await expect(token.connect(admin).changeAdmin(user1.address))
                .to.emit(token, "AdminChanged")
                .withArgs(admin.address, user1.address);
        });
    });

    describe("Gas Usage", function () {
        it("Should track gas usage for transfers", async function () {
            await token.connect(minter).mint(user1.address, INITIAL_MINT);
            const transferAmount = ethers.utils.parseEther("100");
            
            const tx = await token.connect(user1).transfer(user2.address, transferAmount);
            const receipt = await tx.wait();
            
            console.log("Gas used for transfer:", receipt.gasUsed.toString());
            expect(receipt.gasUsed.gt(0)).to.be.true;
        });

        it("Should track gas usage for minting", async function () {
            const tx = await token.connect(minter).mint(user1.address, INITIAL_MINT);
            const receipt = await tx.wait();
            
            console.log("Gas used for minting:", receipt.gasUsed.toString());
            expect(receipt.gasUsed.gt(0)).to.be.true;
        });
    });
});