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
          userAssociatedAddresses
        }
      }
    }
  `;

  const variables = { fid: `fc_fid:${fid}` };

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const socialData = data.data?.Socials?.Social?.[0] || {};
    const userAddresses = socialData.userAssociatedAddresses || [];

    // Fetch both daily allocation and current balance
    const { dailyAllocation, currentBalance } = await getDegenTippingInfo(userAddresses);

    return {
      profileName: socialData.profileName || null,
      profileImage: socialData.profileImage || null,
      followerCount: socialData.followerCount || 0,
      dailyAllocation,
      currentBalance
    };
  } catch (error) {
    console.error('Error in getDegenUserInfo:', error);
    throw error;
  }
}

async function getDegenTippingInfo(addresses: string[]): Promise<{ dailyAllocation: string, currentBalance: string }> {
  const DEGEN_TIPPING_CONTRACT = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed";
  const DEGEN_TOKEN_ADDRESS = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed"; // Assuming this is the correct token address

  const query = `
    query DegenTippingInfo($addresses: [Address!]!, $tokenAddress: Address!, $tippingContract: Address!) {
      TokenBalances(
        input: {filter: {owner: {_in: $addresses}, tokenAddress: {_eq: $tokenAddress}}, blockchain: base}
      ) {
        TokenBalance {
          formattedAmount
        }
      }
      ContractFunctions(
        input: {filter: {address: {_eq: $tippingContract}, functionName: {_eq: "getDailyAllocation"}}, blockchain: base}
      ) {
        FunctionCall {
          outputValues
        }
      }
    }
  `;

  const variables = { 
    addresses: addresses,
    tokenAddress: DEGEN_TOKEN_ADDRESS,
    tippingContract: DEGEN_TIPPING_CONTRACT
  };

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Degen Tipping Info API response:', JSON.stringify(data, null, 2));

    const currentBalance = data.data?.TokenBalances?.TokenBalance?.[0]?.formattedAmount || "0";
    const dailyAllocation = data.data?.ContractFunctions?.FunctionCall?.[0]?.outputValues?.[0] || "0";

    return { dailyAllocation, currentBalance };
  } catch (error) {
    console.error('Error fetching DEGEN tipping info:', error);
    return { dailyAllocation: "0", currentBalance: "0" };
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
  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

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
    const userInfo = await getDegenUserInfo(fid.toString());

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
    console.error('Error in balance check:', error);
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