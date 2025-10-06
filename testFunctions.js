import fetch from "node-fetch";

const FUNCTION_URL = "https://ryiqdiqcmvwdotnrosac.supabase.co/functions/v1/auth-login";
const EMAIL = "folashade@greenfield.edu.ng"; // test user
const WRONG_PASSWORD = "incorrect123";       // intentionally wrong
const ATTEMPTS = 10;                         // more than your RL_LOGIN_MAX
const DELAY_MS = 200;                        // delay between attempts

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFailedLogin() {
  console.log(`Testing failed login rate limit for ${EMAIL}`);
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: WRONG_PASSWORD })
      });

      const data = await res.json();
      console.log(`Attempt ${i}: status=${res.status}`, data);

      if (res.status === 429) {
        console.log("✅ Rate limit triggered!");
        break;
      }
    } catch (err) {
      console.error(`Attempt ${i} error:`, err.message);
    }

    await delay(DELAY_MS);
  }
  console.log("Finished testing failed login rate limit.");
}

testFailedLogin();
