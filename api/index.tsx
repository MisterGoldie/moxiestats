import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e';

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$MOXIE Stats Tracker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

interface MoxieStats {
  allEarningsAmount: string;
  castEarningsAmount: string;
  frameDevEarningsAmount: string;
  otherEarningsAmount: string;
  profileName: string | null;
  profileImage: string | null;
  followerCount: number;
}

async function getMoxieStats(fid: string): Promise<MoxieStats> {
  const query = `
    query MoxieEarningStatsFrame {
      FarcasterMoxieEarningStats(
        input: {timeframe: TODAY, blockchain: ALL, filter: {entityType: {_eq: USER}, entityId: {_eq: "fc_fid:${fid}"}}}
      ) {
        FarcasterMoxieEarningStat {
          allEarningsAmount
          castEarningsAmount
          frameDevEarningsAmount
          otherEarningsAmount
          socials {
            profileName
            profileImage
            followerCount
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response:', JSON.stringify(data, null, 2));

    const stats = data.data.FarcasterMoxieEarningStats.FarcasterMoxieEarningStat[0];
    return {
      allEarningsAmount: stats.allEarningsAmount,
      castEarningsAmount: stats.castEarningsAmount,
      frameDevEarningsAmount: stats.frameDevEarningsAmount,
      otherEarningsAmount: stats.otherEarningsAmount,
      profileName: stats.socials[0]?.profileName || null,
      profileImage: stats.socials[0]?.profileImage || null,
      followerCount: stats.socials[0]?.followerCount || 0
    };
  } catch (error) {
    console.error('Error fetching Moxie stats:', error);
    throw error;
  }
}

app.frame('/', (c) => {
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
        padding: '20px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{
          fontSize: '60px',
          marginBottom: '20px',
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        }}>$MOXIE Stats Tracker</h1>
        <p style={{
          fontSize: '36px',
          marginBottom: '20px',
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        }}>Click to check your $MOXIE stats</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Stats</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};

  if (!fid) {
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
    const stats = await getMoxieStats(fid.toString());

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center', color: 'white' }}>Your $MOXIE Stats</h1>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            {stats.profileImage ? (
              <img 
                src={stats.profileImage} 
                alt="Profile" 
                style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px' }}
              />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stats.profileName ? stats.profileName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <p style={{ fontSize: '32px', textAlign: 'center', color: 'white' }}>{stats.profileName || `FID: ${fid}`}</p>
          </div>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Total Earnings: {stats.allEarningsAmount} $MOXIE</p>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Cast Earnings: {stats.castEarningsAmount} $MOXIE</p>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Frame Dev Earnings: {stats.frameDevEarningsAmount} $MOXIE</p>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Other Earnings: {stats.otherEarningsAmount} $MOXIE</p>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Followers: {stats.followerCount}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>
      ]
    });
  } catch (error) {
    console.error('Error in stats check:', error);
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1DA1F2' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'white' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center', color: 'white' }}>Unable to fetch $MOXIE stats. Please try again later.</p>
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