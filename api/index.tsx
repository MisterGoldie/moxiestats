import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';
import { ethers } from 'ethers';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e';
const BASE_RPC_URL = 'https://mainnet.base.org';
const MOXIE_TOKEN_ADDRESS = '0x8C9037D1Ef5c6D1f6816278C7AAF5491d24CD527';

const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
const moxieTokenABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
const moxieTokenContract = new ethers.Contract(MOXIE_TOKEN_ADDRESS, moxieTokenABI, provider);

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$MOXIE Balance Tracker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

interface MoxieUserInfo {
  profileName: string | null;
  profileImage: string | null;
  moxieBalance: string;
  todayEarnings: string;
  lifetimeEarnings: string;
}

async function getMoxieUserInfo(fid: string): Promise<MoxieUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const query = `
    query UserMoxieEarnings($fid: String!) {
      Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          profileName
          profileImage
          userAssociatedAddresses
        }
      }
      todayEarnings: FarcasterMoxieEarningStats(
        input: {timeframe: TODAY, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: $fid}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
        }
      }
      lifetimeEarnings: FarcasterMoxieEarningStats(
        input: {timeframe: LIFETIME, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: $fid}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
        }
      }
    }
  `;

  const variables = { fid: `fc_fid:${fid}` };

  try {
    console.log('Sending query to Airstack API...');
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', JSON.stringify(data, null, 2));

    const socialInfo = data.data?.Socials?.Social?.[0] || {};
    const userAddress = socialInfo.userAssociatedAddresses?.[0];

    if (!userAddress) {
      throw new Error('No associated Ethereum address found for the user');
    }

    const todayEarnings = data.data?.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const lifetimeEarnings = data.data?.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';

    console.log('Fetching $MOXIE balance for address:', userAddress);
    const balance = await moxieTokenContract.balanceOf(userAddress);
    const decimals = await moxieTokenContract.decimals();
    const formattedBalance = ethers.formatUnits(balance, decimals);

    console.log('$MOXIE balance:', formattedBalance);
    console.log('Today\'s earnings:', todayEarnings);
    console.log('Lifetime earnings:', lifetimeEarnings);

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      moxieBalance: formattedBalance,
      todayEarnings,
      lifetimeEarnings
    };
  } catch (error) {
    console.error('Detailed error in getMoxieUserInfo:', error);
    throw error;
  }
}

app.frame('/', (c) => {
  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmYM1zqkhqLr8aMwbHLqiKhgyZKg35hAU98ASz5M76pt26';
  
  return c.res({
    image: (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1DA1F2',
      }} />
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  console.log('Checking balance...');
  const { fid } = c.frameData || {};
  const { displayName } = c.var.interactor || {};

  console.log(`FID: ${fid}, Display Name: ${displayName}`);

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Unable to retrieve Farcaster ID.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  let userInfo;
  let errorMessage = '';

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    userInfo = await getMoxieUserInfo(fid.toString());
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error('Detailed error in balance check:', error);
    errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  }

  return c.res({
    image: (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#f0f0f0',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>$MOXIE Info</h1>
        <p style={{ fontSize: '36px', marginBottom: '10px' }}>FID: {fid}</p>
        <p style={{ fontSize: '36px', marginBottom: '10px' }}>Name: {displayName || 'N/A'}</p>
        {errorMessage ? (
          <p style={{ fontSize: '24px', color: 'red' }}>Error: {errorMessage}</p>
        ) : (
          <>
            <p style={{ fontSize: '32px', marginBottom: '10px' }}>Balance: {userInfo?.moxieBalance || '0'} $MOXIE</p>
            <p style={{ fontSize: '32px', marginBottom: '10px' }}>Today's Earnings: {userInfo?.todayEarnings || '0'} $MOXIE</p>
            <p style={{ fontSize: '32px' }}>Lifetime Earnings: {userInfo?.lifetimeEarnings || '0'} $MOXIE</p>
          </>
        )}
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button action="/check">Refresh</Button>
    ]
  });
});

export const GET = handle(app);
export const POST = handle(app);