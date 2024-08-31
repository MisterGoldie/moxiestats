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
}

async function getMoxieUserInfo(fid: string): Promise<MoxieUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const query = `
    query UserInfo($fid: String!) {
      Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          profileName
          profileImage
          userAssociatedAddresses
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

    console.log('Fetching $MOXIE balance for address:', userAddress);
    const balance = await moxieTokenContract.balanceOf(userAddress);
    const decimals = await moxieTokenContract.decimals();
    const formattedBalance = ethers.formatUnits(balance, decimals);

    console.log('$MOXIE balance:', formattedBalance);

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      moxieBalance: formattedBalance,
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
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log(`FID: ${fid}, Display Name: ${displayName}, PFP URL: ${pfpUrl}`);

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'white' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Unable to retrieve your Farcaster ID. Please ensure you have a valid Farcaster profile.</p>
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
        backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmdUvMCf1BxRo5TKdDikaoXcHNh37kGJyw8TqgDGkznSCj)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {pfpUrl ? (
            <img 
              src={pfpUrl} 
              alt="Profile" 
              style={{ 
                width: '160px', 
                height: '160px', 
                borderRadius: '50%',
                border: '3px solid black'
              }}
            />
          ) : (
            <div style={{ 
              width: '160px', 
              height: '160px', 
              borderRadius: '50%', 
              backgroundColor: '#ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '3px solid black',
              fontSize: '80px',
              color: '#333'
            }}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <p style={{ 
            fontSize: '24px', 
            marginTop: '10px', 
            color: 'black', 
          }}>
            FID: {fid}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#333' }}>$MOXIE Balance</h1>
          {errorMessage ? (
            <p style={{ fontSize: '24px', color: 'red' }}>Error: {errorMessage}</p>
          ) : (
            <p style={{ fontSize: '36px', color: '#333' }}>Balance: {userInfo?.moxieBalance || '0'} $MOXIE</p>
          )}
        </div>
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