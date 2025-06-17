import { resolveResourceLocation } from '../utils/resolve'

function testResolveResourceLocation() {
  const cases : [string, ResourceLocation | undefined][] = [
    ['bar:code', { namespace: 'bar', path: ['code'] }],
    ['minecraft:zombie', { namespace: 'minecraft', path: ['zombie'] }],
    ['diamond', { namespace: 'minecraft', path: ['diamond'] }],
    [':dirt', { namespace: 'minecraft', path: ['dirt'] }],
    ['minecraft:', { namespace: 'minecraft', path: [] }],
    [':', { namespace: 'minecraft', path: [] }],
    ['', { namespace: 'minecraft', path: [] }],
    ['foo/bar:coal', undefined],
    ['minecraft/villager', { namespace: 'minecraft', path: ['minecraft', 'villager'] }],
    ['mypack_recipe', { namespace: 'minecraft', path: ['mypack_recipe'] }],
    ['mymap:schrödingers_var', undefined],
    ['custom_pack:Capital', undefined],
    
    ['ns:', { namespace: 'ns', path: [] }],
    ['ns:pa/pa2', { namespace: 'ns', path: ['pa', 'pa2'] }],
    ['ns:pa/pa2/pa3', { namespace: 'ns', path: ['pa', 'pa2', 'pa3'] }],
    ['ns:pa/', { namespace: 'ns', path: ['pa', ''] }],
    ['ns:p.a', { namespace: 'ns', path: ['p.a'] }],
    ['n.s:pa', { namespace: 'n.s', path: ['pa'] }],
  ]

  for (const [input, expected] of cases) {
    const resultJson = JSON.stringify(resolveResourceLocation(input))
    const expectedJson = JSON.stringify(expected)
    console.assert(resultJson === expectedJson, `${resultJson} is not ${expectedJson} for ${input}`)
  }
}

testResolveResourceLocation()
