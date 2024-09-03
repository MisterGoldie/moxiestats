import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your actual API key
const NEYNAR_API_KEY = '71332A9D-240D-41E0-8644-31BD70E64036'; // Replace with your actual Neynar API key
const FRAME_CAST_HASH = process.env.FRAME_CAST_HASH || '';

const MAIN_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmWy8CBXYSKLL9egN1h33Q3ErdDdyxkWaT3pAr1xnSCZ3N';
const CHECK_BACKGROUND_IMAGE = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmPEucEh1aDvSUeiFV3pgTcxqhYXbrADSuixd8wMkUqSrw';

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

async function hasLikedAndRecasted(fid: string): Promise<boolean> {
  if (!FRAME_CAST_HASH) {
    console.log('No frame cast hash set. Skipping like/recast check.');
    return true; // Always return true if no hash is set
  }

  const url = `https://api.neynar.com/v2/farcaster/reactions/cast?hash=${FRAME_CAST_HASH}&types=likes%2Crecasts&limit=50`;
  const options = {
    method: 'GET',
    headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    const hasLiked = data.likes.some((like: any) => like.reactor.fid === fid);
    const hasRecasted = data.recasts.some((recast: any) => recast.recaster.fid === fid);

    return hasLiked && hasRecasted;
  } catch (error) {
    console.error('Error checking likes and recasts:', error);
    return false;
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundImage: `url(${MAIN_BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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

  console.log(`FID: ${fid}`);

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${CHECK_BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  const hasInteracted = await hasLikedAndRecasted(fid.toString());

  if (!hasInteracted) {
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${CHECK_BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Check Again</Button>
      ]
    });
  }

  try {
    console.log(`Fetching user info for FID: ${fid}`);
    await getMoxieUserInfo(fid.toString());
    console.log('User info retrieved successfully');
    
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${CHECK_BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>,
      ]
    });
  } catch (error) {
    console.error('Error in getMoxieUserInfo:', error);
    
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${CHECK_BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
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