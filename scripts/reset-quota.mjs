import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('REDIS_URL not set');
  process.exit(1);
}

const client = new Redis(redisUrl);

async function resetQuota() {
  try {
    // Delete anonymous quota
    const anonResult = await client.del('quota:user:anonymous');
    console.log('Deleted quota:user:anonymous:', anonResult ? 'success' : 'key not found');
    
    // Check for any other quota keys
    const keys = await client.keys('quota:user:*');
    console.log('Found quota keys:', keys);
    
    if (keys.length > 0) {
      const delResult = await client.del(...keys);
      console.log('Deleted all quota keys:', delResult);
    }
    
    // Also reset rate limit keys
    const rateLimitKeys = await client.keys('ratelimit:*');
    console.log('Found rate limit keys:', rateLimitKeys.length);
    if (rateLimitKeys.length > 0) {
      await client.del(...rateLimitKeys);
      console.log('Deleted rate limit keys');
    }
    
    console.log('Quota reset complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.quit();
  }
}

resetQuota();
