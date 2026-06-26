import { redirect } from 'next/navigation'

type Props = { params: Promise<{ section: string }> }

const validSections = new Set(['srt', 'rtmp', 'hls', 'webrtc', 'rtsp', 'api', 'auth'])

export default async function ProtocolSectionPage({ params }: Props) {
  const { section } = await params
  if (validSections.has(section)) {
    redirect(`/protocols#${section}`)
  }
  redirect('/protocols')
}
