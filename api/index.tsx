import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your actual API key

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$MOXIE Earnings Tracker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

interface MoxieUserInfo {
  profileName: string | null;
  profileImage: string | null;
  todayEarnings: string;
  lifetimeEarnings: string;
  farScore: number | null;
}

async function getMoxieUserInfo(fid: string): Promise<MoxieUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const query = `
    query MoxieEarnings($fid: String!) {
      socialInfo: Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          profileName
          profileImage
          farcasterScore {
            farScore
          }
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

  const variables = { fid: fid };

  console.log('Query:', query);
  console.log('Variables:', JSON.stringify(variables, null, 2));

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
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error('GraphQL errors in the response');
    }

    const socialInfo = data.data?.socialInfo?.Social?.[0] || {};
    const todayEarnings = data.data?.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const lifetimeEarnings = data.data?.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const farScore = socialInfo.farcasterScore?.farScore || null;

    console.log('Parsed social info:', socialInfo);
    console.log('Today Earnings:', todayEarnings);
    console.log('Lifetime Earnings:', lifetimeEarnings);
    console.log('Farscore:', farScore);

    return {
      profileName: socialInfo.profileName || null,
      profileImage: socialInfo.profileImage || null,
      todayEarnings: todayEarnings,
      lifetimeEarnings: lifetimeEarnings,
      farScore: farScore,
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
      <Button action="/check">Check Earnings</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  console.log('Entering /check frame');
  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log(`FID: ${fid}, Display Name: ${displayName}, PFP URL: ${pfpUrl}`);

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'white' }}>Error: No FID</h1>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  let userInfo: MoxieUserInfo | null = null;
  let errorMessage = '';

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    userInfo = await getMoxieUserInfo(fid.toString());
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
    errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  }

  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmdUvMCf1BxRo5TKdDikaoXcHNh37kGJyw8TqgDGkznSCj';

  console.log('Rendering frame');
  return c.res({
    image: (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif',
        color: 'white',
        position: 'relative'
      }}>
        {pfpUrl && (
          <img 
            src={pfpUrl} 
            alt="Profile" 
            style={{ 
              position: 'absolute',
              top: '20px',
              left: '20px',
              width: '100px', 
              height: '100px', 
              borderRadius: '50%',
              border: '2px solid white'
            }}
          />
        )}
        <div style={{ position: 'absolute', top: '20px', left: '140px' }}>
          <p>FID: {fid}</p>
          {userInfo && userInfo.farScore !== null && (
            <p>Farscore: {userInfo.farScore.toFixed(2)}</p>
          )}
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '20px', textAlign: 'right' }}>
          {userInfo && (
            <>
              <p style={{ fontSize: '24px', marginBottom: '10px' }}>
                {userInfo.todayEarnings || '0'} $MOXIE
              </p>
              <p style={{ fontSize: '24px', marginBottom: '10px' }}>
                {userInfo.lifetimeEarnings || '0'} $MOXIE
              </p>
            </>
          )}
        </div>
        {errorMessage && (
          <p style={{ position: 'absolute', bottom: '20px', left: '20px', color: 'red' }}>
            Error: {errorMessage}
          </p>
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