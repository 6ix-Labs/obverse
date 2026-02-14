const ethers = require('ethers');

async function checkRpc() {
    const rpcUrl = 'https://testnet-rpc.monad.xyz/';
    console.log(`Connecting to ${rpcUrl}...`);
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        console.log(`Connected! Chain ID: ${network.chainId}`);
        const blockNumber = await provider.getBlockNumber();
        console.log(`Current Block: ${blockNumber}`);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

checkRpc();
