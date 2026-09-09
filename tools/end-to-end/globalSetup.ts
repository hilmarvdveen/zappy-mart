import { frontendUrl, graphqlUrl, resetSeedBeforeRun } from "./playwright.config";

const resetSeedDocument = `
  mutation ResetSeed {
    resetSeed {
      success
      loadedProducts
    }
  }
`;

async function reachableOrThrow(address: string): Promise<void> {
  try {
    await fetch(address, { method: "GET" });
  } catch (unreachable) {
    throw new Error(
      `Nothing answers at ${address}. Start the store front and the Zappy Mart API before this suite.`,
      { cause: unreachable },
    );
  }
}

async function resetSeed(): Promise<void> {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: frontendUrl,
    },
    body: JSON.stringify({ query: resetSeedDocument }),
  });
  const answer = (await response.json()) as {
    data?: { resetSeed?: { success: boolean; loadedProducts: number } };
  };
  const outcome = answer.data?.resetSeed;
  if (outcome === undefined || !outcome.success) {
    throw new Error(
      `The API at ${graphqlUrl} refused resetSeed. It is available only in a development profile.`,
    );
  }
  console.warn(
    `Seed reloaded at ${graphqlUrl} with ${outcome.loadedProducts} products.`,
  );
}

export default async function globalSetup(): Promise<void> {
  await reachableOrThrow(frontendUrl);
  if (resetSeedBeforeRun) {
    await resetSeed();
  }
}
