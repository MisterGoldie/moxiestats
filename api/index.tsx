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
  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmNa4UgwGS1LZFCFqQ8yyPkLZ2dHomUh1WyrmEFkv3TY2s';
  
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
      <Button action="/check">Check stats</Button>,
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

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    userInfo = await getMoxieUserInfo(fid.toString());
    console.log('User info retrieved:', JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
  }

  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmPEucEh1aDvSUeiFV3pgTcxqhYXbrADSuixd8wMkUqSrw';

  const shareText = userInfo 
    ? `I've earned ${Number(userInfo.todayEarnings).toFixed(2)} $MOXIE today and ${Number(userInfo.lifetimeEarnings).toFixed(2)} $MOXIE all-time 😏! Check your @moxie.eth stats. Frame by @goldie`
    : 'Check your @moxie.eth stats on Farcaster!';
  
  const shareUrl = `https://moxiestats.vercel.app/api/share?fid=${fid}`;
  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            {pfpUrl ? (
              <img 
                src={pfpUrl} 
                alt="Profile" 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  border: '3px solid black',
                  marginRight: '20px'
                }}
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                backgroundColor: '#ccc', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '3px solid black',
                fontSize: '60px',
                color: '#333',
                marginRight: '20px'
              }}>
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h1 style={{ 
              fontSize: '60px', 
              color: 'black', 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              margin: 0
            }}>
              @{displayName || 'User'}
            </h1>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <p style={{ 
              fontSize: '60px', 
              color: 'black', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              margin: '0 0 5px 0'
            }}>
              FID: {fid}
            </p>
            {userInfo && userInfo.farScore !== null && (
              <p style={{ 
                fontSize: '24px', 
                color: 'black', 
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                margin: 0
              }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        {userInfo ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gridGap: '20px',
            flex: 1
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie earned today
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {Number(userInfo.todayEarnings).toFixed(2)}
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie earned all-time
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {Number(userInfo.lifetimeEarnings).toFixed(2)}
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie in progress
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {/* Add logic to calculate Moxie in progress */}
                0.00
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                How much Moxie you've claimed
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {/* Add logic to calculate claimed Moxie */}
                0.00
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '36px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No user data available</p>
        )}
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button action="/check">Refresh</Button>,
      <Button.Link href={farcasterShareURL}>Share</Button.Link>,
    ]
  });
});

app.frame('/share', async (c) => {
  const fid = c.req.query('fid');
  
  if (!fid) {
    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#1DA1F2',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Error: No FID provided</h1>
        </div>
      ),
      intents: [
        <Button action="/check">Check Your Stats</Button>
      ]
    });
  }

  let userInfo: MoxieUserInfo | null = null;
  try {
    userInfo = await getMoxieUserInfo(fid);
  } catch (error) {
    console.error('Error fetching user info:', error);
  }

  const backgroundImageUrl = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmPEucEh1aDvSUeiFV3pgTcxqhYXbrADSuixd8wMkUqSrw';

  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            {userInfo && userInfo.profileImage ? (
              <img 
                src={userInfo.profileImage} 
                alt="Profile" 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  border: '3px solid black',
                  marginRight: '20px'
                }}
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                backgroundColor: '#ccc', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '3px solid black',
                fontSize: '60px',
                color: '#333',
                marginRight: '20px'
              }}>
                {userInfo && userInfo.profileName ? userInfo.profileName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h1 style={{ 
              fontSize: '60px', 
              color: 'black', 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              margin: 0
            }}>
              @{userInfo ? userInfo.profileName : 'User'}
            </h1>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <p style={{ 
              fontSize: '24px', 
              color: 'black', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              margin: '0 0 5px 0'
            }}>
              FID: {fid}
            </p>
            {userInfo && userInfo.farScore !== null && (
              <p style={{ 
                fontSize: '24px', 
                color: 'black', 
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                margin: 0
              }}>
                Farscore: {userInfo.farScore.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        {userInfo ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gridGap: '20px',
            flex: 1
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie earned today
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {Number(userInfo.todayEarnings).toFixed(2)}
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie earned all-time
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {Number(userInfo.lifetimeEarnings).toFixed(2)}
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                Moxie in progress
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {/* Add logic to calculate Moxie in progress */}
                0.00
              </p>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '15px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{ fontSize: '24px', marginBottom: '10px', color: 'black' }}>
                How much Moxie you've claimed
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'black' }}>
                {/* Add logic to calculate claimed Moxie */}
                0.00
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '36px', color: 'black', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No user data available</p>
        )}
      </div>
    ),
    intents: [
      <Button action="/check">Check Your Stats</Button>
    ]
  });
});

export const GET = handle(app);
export const POST = handle(app);