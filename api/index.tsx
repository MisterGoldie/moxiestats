import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import { neynar } from 'frog/middlewares';
import fetch from 'node-fetch';

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
  todayEarnings: string;
  lifetimeEarnings: string;
  farScore: number | null;
}

async function getMoxieUserInfo(fid: string): Promise<MoxieUserInfo> {
  console.log(`Fetching info for FID: ${fid}`);

  const query = `
    query MoxieEarnings($fid: String!) {
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
      socialInfo: Socials(
        input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
      ) {
        Social {
          farcasterScore {
            farScore
          }
        }
      }
    }
  `;

  const variables = { fid: fid };

  try {
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

    const todayEarnings = data.data?.todayEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const lifetimeEarnings = data.data?.lifetimeEarnings?.FarcasterMoxieEarningStat?.[0]?.allEarningsAmount || '0';
    const farScore = data.data?.socialInfo?.Social?.[0]?.farcasterScore?.farScore || null;

    return {
      todayEarnings,
      lifetimeEarnings,
      farScore,
    };
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
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
        color: 'white',
        fontSize: '40px',
        textAlign: 'center',
      }}>
        <p>Welcome to $MOXIE Earnings Tracker</p>
        <p>Click to check your earnings</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Earnings</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};

  if (!fid) {
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#1DA1F2',
          color: 'white',
          fontSize: '32px',
          textAlign: 'center',
        }}>
          Error: No FID found
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
      ],
    });
  }

  try {
    const userInfo = await getMoxieUserInfo(fid.toString());

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
          fontSize: '32px',
          textAlign: 'center',
        }}>
          <p>Your $MOXIE Earnings</p>
          <p>Today: {userInfo.todayEarnings}</p>
          <p>Lifetime: {userInfo.lifetimeEarnings}</p>
          <p>FID: {fid}</p>
          {userInfo.farScore !== null && <p>Farscore: {userInfo.farScore.toFixed(2)}</p>}
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>,
        <Button.Mint target="/mint">Share Stats</Button.Mint>
      ],
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#1DA1F2',
          color: 'white',
          fontSize: '32px',
          textAlign: 'center',
        }}>
          Error fetching data. Please try again.
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>,
      ],
    });
  }
});

app.frame('/mint', (c) => {
  return c.res({
    image: (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1DA1F2',
        color: 'white',
        fontSize: '40px',
      }}>
        $MOXIE Stats shared successfully!
      </div>
    ),
    intents: [
      <Button action="/check">Back to Stats</Button>
    ],
  });
});

export const GET = handle(app);
export const POST = handle(app);