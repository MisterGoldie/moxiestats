import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your actual API key

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$DEGEN Tipping Balance Tracker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

interface DegenUserInfo {
  profileName: string | null;
  profileImage: string | null;
  followerCount: number;
  degenBalance: string;
}

async function getDegenUserInfo(fid: string): Promise<DegenUserInfo> {
  const query = `
    query DegenTippingBalanceTracker($fid: String!) {
      Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          dappName
          profileName
          profileImage
          followerCount
          userAddressDetails {
            tokenBalances(
              input: {filter: {tokenAddress: {_eq: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed"}}, blockchain: base}
            ) {
              amount
              formattedAmount
            }
          }
        }
      }
    }
  `;

  const variables = { fid: `fc_fid:${fid}` };
  console.log('Query:', query);
  console.log('Variables:', JSON.stringify(variables, null, 2));

  try {
    console.log('Fetching $DEGEN balance for FID:', fid);

    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airstack API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    console.log('Full Airstack API response:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error('GraphQL errors in the response');
    }

    const socialData = data.data?.Socials?.Social?.[0] || {};
    console.log('Social data:', socialData);

    const profileImage = socialData.profileImage;
    console.log('Profile image URL:', profileImage);

    const degenBalance = socialData.userAddressDetails?.[0]?.tokenBalances?.[0]?.formattedAmount || '0';
    console.log('$DEGEN balance:', degenBalance);

    return {
      profileName: socialData.profileName || null,
      profileImage: profileImage,
      followerCount: socialData.followerCount || 0,
      degenBalance: degenBalance
    };
  } catch (error) {
    console.error('Detailed error in getDegenUserInfo:', error);
    throw error;
  }
}

app.frame('/', (c) => {
  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmdwBfrmugTHyChLfaA9AaV6AjqasvoaVZjP1A6aBzRai9';
  
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
        backgroundColor: '#1DA1F2', // Fallback background color
      }} />
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));

  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log('FID:', fid);
  console.log('Display Name:', displayName);
  console.log('Profile Picture URL:', pfpUrl);

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

  try {
    const userInfo = await getDegenUserInfo(fid.toString());
    console.log('Retrieved user info:', userInfo);

    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmeWercMgYhWR263URGjFihei7PdwW92mf8MsfH5ZwBZva)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '20px', 
          boxSizing: 'border-box',
          position: 'relative'  // Added for absolute positioning of profile picture
        }}>
          {/* Profile picture in top left corner */}
          {pfpUrl ? (
            <img 
              src={pfpUrl} 
              alt="Profile" 
              style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '20px', 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%',
                border: '3px solid white'  // Added white border for visibility
              }}
            />
          ) : (
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              left: '20px', 
              width: '150px', 
              height: '150px', 
              borderRadius: '50%', 
              backgroundColor: '#ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '3px solid white',  // Added white border for visibility
              fontSize: '36px',
              color: '#333'
            }}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          
          <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $DEGEN Balance</h1>
          <p style={{ fontSize: '40px', textAlign: 'center', marginBottom: '20px' }}>{displayName || `FID: ${fid}` || 'Unknown User'}</p>
          <p style={{ fontSize: '52px', textAlign: 'center' }}>Balance: {userInfo.degenBalance} $DEGEN</p>
          <p style={{ fontSize: '34px', marginTop: '10px', textAlign: 'center' }}>Followers: {userInfo.followerCount}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>
      ]
    });
  } catch (error) {
    console.error('Detailed error in balance check:', error);
    let errorMessage = 'Unable to fetch $DEGEN balance. Please try again later.';
    if (error instanceof Error) {
      errorMessage += ` Error: ${error.message}`;
    }
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'white' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>{errorMessage}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>
      ]
    });
  }
});

export const GET = handle(app);
export const POST = handle(app);