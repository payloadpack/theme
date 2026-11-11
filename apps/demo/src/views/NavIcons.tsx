import type { AdminViewServerProps } from 'payload'

import { Gutter, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const navIconsStylesheetPath = path.join(process.cwd(), 'node_modules/@payloadpack/theme/dist/options/nav-icons.css')

const readNavIconMatchWords = async () => {
  const navIconsStylesheet = await readFile(navIconsStylesheetPath, 'utf8')
  const matchWords = Array.from(navIconsStylesheet.matchAll(/\[id\*='([^']+)' i\]/g), ([, matchWord]) => matchWord)
  return [...new Set(matchWords)].sort()
}

export async function NavIconsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult
  const matchWords = await readNavIconMatchWords()

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={{ collections: visibleEntities.collections, globals: visibleEntities.globals }}>
      <SetStepNav nav={[{ label: 'Nav icons' }]} />
      <header className="list-header">
        <h1 className="list-header__title">Nav icons</h1>
      </header>
      <Gutter>
        <div className="nav-icons-overview">
          {matchWords.map((matchWord) => (
            <div className="nav__link" id={`nav-icons-${matchWord}`} key={matchWord}>
              <span className="nav__link-label">{matchWord}</span>
            </div>
          ))}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
