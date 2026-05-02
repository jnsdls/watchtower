const mainUrl = process.env.WATCHTOWER_MAIN_URL;

if (mainUrl === undefined) {
  throw new Error("WATCHTOWER_MAIN_URL is required.");
}

await import(mainUrl);
