const { metaMaskWallet } = require('@rainbow-me/rainbowkit/wallets');
try {
    const mm = metaMaskWallet({ projectId: 'test' });
    console.log('Type of mm:', typeof mm);
    if (typeof mm === 'function') {
        console.log('mm is a function');
    } else {
        console.log('mm is an object:', Object.keys(mm));
    }
} catch (e) {
    console.log('Error:', e.message);
}
