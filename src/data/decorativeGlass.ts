const approvedDecorativeGlassNames = new Set([
  'bay point',
  'cadence',
  'cobblestone',
  'dorian',
  'dutchcraft',
  'grace',
  'heirlooms',
  'lazarus',
  'leland',
  'lexington',
  'majestic',
  'margate',
  'mistify',
  'mohave',
  'nouveau',
  'oak park',
  'ovation',
  'paris',
  'private lites',
  'renewed impressions',
  'topaz',
  'vilano',
  'waterside',
])

const baseGlassName = (name: string) => name
  .split(/\s+[–-]\s+/)[0]
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')

export const isApprovedDecorativeGlassName = (name: string) => approvedDecorativeGlassNames.has(baseGlassName(name))

export const approvedDecorativeGlassIds = new Set([
  'bay-point', 'cadence', 'cobblestone', 'cr14pl-dorian', 'dorian-nickel', 'dorian-patina',
  'dutchcraft', 'ca-grace-nickel', 'ca-grace-patina', 'grace-nickel', 'grace-patina',
  'ca-heirloom-brass', 'ca-heirloom-nickel', 'heirlooms-brass', 'heirlooms-nickel',
  'lazarus', 'leland', 'lexington', 'majestic-nickel', 'majestic-patina', 'margate',
  'mistify', 'mohave', 'hrt-nouveau-nickel', 'hrt-nouveau-patina', 'nouveau-nickel',
  'nouveau-patina', 'oak-park', 'ovation', 'paris', 'privacy', 'renewed-impressions',
  'topaz', 'vilano', 'waterside',
])

export const knownDecorativeGlassIds = new Set([
  'ashbury', 'bay-point', 'berkley', 'briselle', 'bristol', 'cadence', 'calandra',
  'carrollton', 'catalina', 'cobblestone', 'courtyard', 'crosswalk', 'cyndi',
  'cr14pl-dorian', 'dorian-nickel', 'dorian-patina', 'dutchcraft', 'edgewood',
  'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'entropy',
  'fragrance', 'garrison', 'geneva', 'ca-grace-nickel', 'ca-grace-patina',
  'grace-nickel', 'grace-patina', 'ca-heirloom-brass', 'ca-heirloom-nickel',
  'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jacinto', 'jameston',
  'laurel', 'lazarus', 'leland', 'lexington', 'london', 'majestic-nickel',
  'majestic-patina', 'margate', 'metro', 'mohave', 'cr14pl-monterey',
  'monterey-nickel', 'monterey-patina', 'neo', 'hrt-nouveau-nickel',
  'hrt-nouveau-patina', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'ovation',
  'paris', 'pembrook', 'prestige', 'renewed-impressions', 'retro', 'rill',
  'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'wyngate',
])
