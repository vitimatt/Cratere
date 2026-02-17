import { client } from './sanity'

export interface PublicationOutlet {
  title?: string
  url?: string
}

export interface Publication {
  outlets?: PublicationOutlet[]
  projectTitle?: string
}

export interface ExhibitionReviewLink {
  title?: string
  url?: string
}

export interface Exhibition {
  title?: string
  reviewLinks?: ExhibitionReviewLink[]
}

export interface SiteSettings {
  bioDescription?: string
  portfolioPdf?: {
    asset?: {
      _id?: string
      url?: string
      originalFilename?: string
    }
  }
  publications?: Publication[]
  exhibitions?: Exhibition[]
  commissions?: string
  studioEmail?: string
  studioPhone?: string
  contactEmail?: string
  address?: string
  websiteLabel?: string
  websiteUrl?: string
}

export type AboutLine =
  | { type: 'text'; content: string; tight: boolean }
  | { type: 'spacing' }
  | { type: 'link'; content: string; url: string; tight: boolean }
  | { type: 'publication'; outlets: { title: string; url?: string }[]; projectTitle: string; tight: boolean }
  | { type: 'exhibition'; title: string; reviewLinks: { title: string; url?: string }[]; tight: boolean }
  | { type: 'email'; content: string; tight: boolean }
  | { type: 'phone'; content: string; tight: boolean }

const DEFAULT_BIO = 'Founded by Alessio Pinna, Felipe Menezes and Riccardo Alippi The crater is the circular cavity at the apex of a volcanic cone. The Crater (in Latin Crater, "cup") is one of the 88 modern constellations and represents the chalice from which Apollo drank the nectar of the Gods. Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.'

const DEFAULT_PUBLICATIONS: Publication[] = [
  { outlets: [{ title: 'Arxipelag' }], projectTitle: 'Sul Sentiero' },
  { outlets: [{ title: 'Phroom' }, { title: 'Zone Magazine' }], projectTitle: 'Teleonomia' },
  { outlets: [{ title: 'Perimetro' }], projectTitle: 'La Cattedrale' },
  { outlets: [{ title: 'C41' }], projectTitle: 'Boring Cactus' },
  { outlets: [{ title: 'Highsnobiety' }, { title: 'Nss sport' }, { title: 'Hypebeast' }], projectTitle: 'Nike ACG Train' },
]

const DEFAULT_EXHIBITIONS: Exhibition[] = [
  { title: '@Daste Bergamo, "One Eye Sees, The Other Feels", 30/04/2022 - 14/05/2022', reviewLinks: [] },
  { title: '@Studio Cratere, "Everything Be Revealed In Time", 05/04/2024 - 03/05/2024', reviewLinks: [] },
  { title: '@Studio Cratere, "Lucid Dreams", 13/06/2024 - 12/07/2024', reviewLinks: [] },
  { title: '@Studio Cratere, "by PHONE", 23/10/2024', reviewLinks: [{ title: 'Highsnobiety' }, { title: 'Nss sport' }, { title: 'Hypebeast' }] },
]

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const settings = await client.fetch<SiteSettings | null>(`
    *[_type == "siteSettings"][0] {
      bioDescription,
      portfolioPdf {
        asset-> {
          _id,
          url,
          originalFilename
        }
      },
      publications,
      exhibitions,
      commissions,
      studioEmail,
      studioPhone,
      contactEmail,
      address,
      websiteLabel,
      websiteUrl
    }
  `)
  return settings
}

export function buildAboutLines(settings: SiteSettings | null): AboutLine[] {
  const bio = settings?.bioDescription || DEFAULT_BIO
  const portfolioPdf = settings?.portfolioPdf?.asset?.url
  const publications = settings?.publications?.length ? settings.publications : DEFAULT_PUBLICATIONS
  const exhibitions = settings?.exhibitions?.length ? settings.exhibitions : DEFAULT_EXHIBITIONS
  const commissions = settings?.commissions ?? 'Represented by C41.eu'
  const studioEmail = settings?.studioEmail ?? 'studio@cratere.studio'
  const studioPhone = settings?.studioPhone ?? 'M: +39 3208740367'
  const contactEmail = settings?.contactEmail ?? 'contact@cratere.studio'
  const address = settings?.address ?? 'Viale Abruzzi 32'
  const websiteLabel = settings?.websiteLabel ?? 'Matteo Viti'
  const websiteUrl = settings?.websiteUrl

  const lines: AboutLine[] = [
    { type: 'text', content: bio, tight: false },
    { type: 'spacing' },
    portfolioPdf
      ? { type: 'link', content: 'Download portfolio', url: portfolioPdf, tight: false }
      : { type: 'text', content: 'Download portfolio', tight: false },
    { type: 'spacing' },
    { type: 'text', content: 'Selected Pubblications', tight: true },
    ...publications.map((p) => ({
      type: 'publication' as const,
      outlets: (p.outlets || []).map((o) => ({ title: o.title || '', url: o.url })),
      projectTitle: p.projectTitle || '',
      tight: true,
    })),
    { type: 'spacing' },
    { type: 'text', content: 'Selected Exhibitions', tight: true },
    ...exhibitions.map((e) => ({
      type: 'exhibition' as const,
      title: e.title || '',
      reviewLinks: (e.reviewLinks || []).map((r) => ({ title: r.title || '', url: r.url })),
      tight: true,
    })),
    { type: 'spacing' },
    { type: 'text', content: 'Commissions', tight: true },
    { type: 'text', content: commissions, tight: true },
    { type: 'spacing' },
    { type: 'email', content: studioEmail, tight: true },
    { type: 'phone', content: studioPhone, tight: true },
    { type: 'spacing' },
    { type: 'text', content: 'General Info', tight: true },
    { type: 'email', content: contactEmail, tight: true },
    { type: 'spacing' },
    { type: 'text', content: 'Address', tight: true },
    { type: 'text', content: address, tight: true },
    { type: 'spacing' },
    { type: 'text', content: 'Website', tight: true },
    websiteUrl
      ? { type: 'link', content: websiteLabel, url: websiteUrl, tight: true }
      : { type: 'text', content: websiteLabel, tight: true },
  ]

  return lines
}
