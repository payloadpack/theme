import { type Character, characters, defaultCharacter, type Option, type Values } from '../characters/index.js'

export function configSnippet(character: Character, values: Values) {
  const defaults: Values = characters[character].defaults
  const changed = (Object.keys(defaults) as Option[]).filter((option) => values[option] !== defaults[option])
  const lines = [
    ...(character === defaultCharacter ? [] : [`  character: '${character}',`]),
    ...(changed.length ? [`  ${character}: { ${changed.map((option) => `${option}: '${values[option]}'`).join(', ')} },`] : [])
  ]

  return lines.length ? `themePlugin({\n${lines.join('\n')}\n})` : 'themePlugin()'
}
