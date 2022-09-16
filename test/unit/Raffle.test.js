const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) ? describe.skip : describe("Raffle Unit Tests", async function () {
    let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
    const chainId = network.config.chainId

    beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })

    describe("constructor", async function() {
        it("Initializes the raffle correctly", async function() {
            // Ideally we make our tests have just 1 assert per "it"
            const raffleState = await raffle.getRaffleState()
            const interval = await raffle.getInterval()
            assert.equal(raffleState.toString(), "0")
            assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        })
    })

    describe("enterRaffle", async function() {
        it("reverts when you don't pay enough", async function () {
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })
        it("records players when they enter", async function() {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            const playerFromContract = await raffle.getPlayers(0)
            assert.equal(playerFromContract, deployer)
        })
        it("emits event on enter", async function() {
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
        })
        it("doesn't allow when raffle is calculating", async function() {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            // We pretend to be a Chainlink Keepeer 
            await raffle.performUpkeep([])
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__NotOpen")
        })
    })
})
