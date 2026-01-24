const {
    metaMaskWallet,
    walletConnectWallet,
    rainbowWallet,
    coinbaseWallet
} = require('@rainbow-me/rainbowkit/wallets');

const projectId = '2207521d9d101b8c3b3bba5de4153012';

const mm = metaMaskWallet({ projectId });
console.log('metaMaskWallet returns:', typeof mm);

const wc = walletConnectWallet({ projectId });
console.log('walletConnectWallet returns:', typeof wc);

const rw = rainbowWallet({ projectId });
console.log('rainbowWallet returns:', typeof rw);

const cb = coinbaseWallet({ appName: 'Test' });
console.log('coinbaseWallet returns:', typeof cb);
