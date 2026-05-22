export function isOfflineMode(): boolean {
  return process.env.NEXT_PUBLIC_OFFLINE_MODE === "1";
}
