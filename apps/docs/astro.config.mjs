import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  base: '/theme',
  site: 'https://payloadpack.github.io',
  integrations: [
    starlight({
      title: '@payloadpack/theme',
      description: 'A warmer, roomier admin theme for Payload 4.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/payloadpack/theme' }],
      customCss: ['@fontsource-variable/inter', './src/styles/docs.css'],
      components: {
        PageTitle: './src/components/PageTitle.astro',
        Sidebar: './src/components/Sidebar.astro',
        SiteTitle: './src/components/SiteTitle.astro'
      },
      expressiveCode: {
        defaultProps: { frame: 'code' },
        themes: ['github-dark', 'github-light'],
        styleOverrides: {
          borderColor: 'var(--docs-border)',
          borderRadius: '0.75rem',
          codeBackground: 'var(--docs-card)',
          codeFontSize: '0.8125rem',
          frames: {
            editorActiveTabBackground: 'var(--docs-card)',
            editorActiveTabIndicatorTopColor: 'transparent',
            editorActiveTabIndicatorBottomColor: 'transparent',
            editorTabBarBackground: 'var(--docs-card)',
            editorTabBarBorderBottomColor: 'var(--docs-border)',
            frameBoxShadowCssValue: 'none',
            terminalBackground: 'var(--docs-card)',
            terminalTitlebarBackground: 'var(--docs-card)',
            terminalTitlebarBorderBottomColor: 'var(--docs-border)'
          }
        }
      },
      sidebar: [
        { slug: 'index', attrs: { 'data-icon': 'book-open' } },
        { slug: 'installation', attrs: { 'data-icon': 'download' } },
        { slug: 'configuration', attrs: { 'data-icon': 'settings-2' } },
        {
          label: 'Guides',
          items: ['styles-and-palettes', 'add-a-palette', 'customize', 'nav-icons', 'translations']
        },
        { label: 'Fields', items: ['fields/vertical-tabs', 'fields/radio-cards', 'fields/switch'] }
      ]
    })
  ]
})
