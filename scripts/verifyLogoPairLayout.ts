import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pair = readFileSync(new URL('../src/styles/logoPair.css', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const mark = readFileSync(new URL('../src/components/DealerBrandMark.tsx', import.meta.url), 'utf8')

assert.match(pair, /flex:\s*0 1 auto/)
assert.match(pair, /align-self:\s*stretch/)
assert.match(pair, /pointer-events:\s*none/)
assert.match(pair, /object-fit:\s*contain/)
assert.match(pair, /aspect-ratio:\s*auto/)
assert.match(pair, /--logo-pair-max-height:\s*72px/)
assert.match(pair, /--logo-pair-max-height:\s*32px/)
const narrow = pair.slice(pair.indexOf('@media (max-width: 560px)'), pair.indexOf('@media (max-width: 400px)'))
assert.doesNotMatch(narrow, /46%/)
assert.match(narrow, /max-width:\s*150px/)
assert.doesNotMatch(pair, /flex:\s*1 1 0|calc\(\(100% - 17px\) \/ 2\)/)
assert.match(styles, /dealer-brand-mark\.dealer-brand-mark--pair>img/)
assert.match(styles, /flex:0 1 auto/)
assert.doesNotMatch(styles, /dealer-brand-mark--pair[\s\S]{0,180}flex:1 1 0/)
assert.match(mark, /dealer-brand-mark--pair logo-pair/)
assert.match(mark, /dealer-logo-divider logo-pair__rule/)
assert.match(mark, /logo-pair__link/)
assert.doesNotMatch(mark, /<a[^>]*dealer-logo-divider|dealer-logo-divider[^>]*<a/)

console.info('Verified dual logos keep their aspect ratio, with a centered divider that is not a link.')
