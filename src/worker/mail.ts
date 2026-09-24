function b64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

/** Plain-text email, UTF-8. */
export function buildRawMail(from: string, to: string, subject: string, body: string): string {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(body),
  ].join('\r\n');
}
