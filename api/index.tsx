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
  dailyAllocation: string;
  currentBalance: string;
}

async function getDegenUserInfo(fid: string): Promise<DegenUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const socialQuery = `
    query DegenTippingBalanceTracker($fid: String!) {
      Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          dappName
          profileName
          profileImage
          followerCount
          userAssociatedAddresses
        }
      }
    }
  `;

  const tippingQuery = `
    query GetDegenTippingInfo($fid: String!) {
      FarcasterMoxieEarningStats(
        input: {timeframe: TODAY, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: $fid}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
          castEarningsAmount
          entityId
          entityType
          timeframe
        }
      }
    }
  `;

  const socialVariables = { fid: `fc_fid:${fid}` };
  const tippingVariables = { fid: `fc_fid:${fid}` };

  try {
    // Fetch social data
    console.log('Fetching social data...');
    const socialResponse = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query: socialQuery, variables: socialVariables })
    });

    if (!socialResponse.ok) {
      throw new Error(`Social data HTTP error! status: ${socialResponse.status}`);
    }

    const socialData = await socialResponse.json();
    console.log('Social data response:', JSON.stringify(socialData, null, 2));
    const socialInfo = socialData.data?.Socials?.Social?.[0] || {};

    // Fetch tipping data
    console.log('Fetching tipping data...');
    const tippingResponse = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query: tippingQuery, variables: tippingVariables })
    });

    if (!tippingResponse.ok) {
      throw new Error(`Tipping data HTTP error! status: ${tippingResponse.status}`);
    }

    const tippingData = await tippingResponse.json();
    console.log('Tipping data response:', JSON.stringify(tippingData, null, 2));
    const tippingInfo = tippingData.data?.FarcasterMoxieEarningStats?.FarcasterMoxieEarningStat?.[0] || {};

    // Parse the tipping information
    const dailyAllocation = tippingInfo.allEarningsAmount || '0';
    const currentBalance = tippingInfo.castEarningsAmount || '0';

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      followerCount: socialInfo.followerCount || 0,
      dailyAllocation,
      currentBalance
    };
  } catch (error) {
    console.error('Error in getDegenUserInfo:', error);
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

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    const userInfo = await getDegenUserInfo(fid.toString());
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));

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
          position: 'relative'
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
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%',
                  border: '3px solid black'
                }}
              />
            ) : (
              <div style={{ 
                width: '180px', 
                height: '180px', 
                borderRadius: '50%', 
                backgroundColor: '#ccc', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '3px solid black',
                fontSize: '90px',
                color: '#333'
              }}>
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <p style={{ 
              fontSize: '24px', 
              marginTop: '10px', 
              color: 'white', 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              FID: {fid}
            </p>
          </div>
          
          <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>$DEGEN Tipping Info</h1>
          <p style={{ fontSize: '40px', textAlign: 'center' }}>Daily Allocation: {userInfo.dailyAllocation} $DEGEN</p>
          <p style={{ fontSize: '40px', textAlign: 'center' }}>Current Balance: {userInfo.currentBalance} $DEGEN</p>
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
    let errorMessage = 'Unable to fetch $DEGEN info. Please try again later.';
    if (error instanceof Error) errorMessage += ` Error: ${error.message}`;
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