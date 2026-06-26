/** Server bootstrap — prefer IPv4 for Docker service DNS (AAAA often fails between containers). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('node:dns')
    dns.setDefaultResultOrder?.('ipv4first')
  }
}
