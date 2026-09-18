export function wssToHttpUrl(wssUrl: string): string {
  return wssUrl.replace(/^wss:\/\//i, "https://");
}
