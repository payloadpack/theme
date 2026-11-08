'use client'

import {
  APIKeyInput,
  Button,
  Combobox,
  type ComboboxEntry,
  DrawerContentContainer,
  FieldLabel,
  PillSelector,
  PopupList,
  SidebarRow
} from '@payloadcms/ui'
import { useState } from 'react'

const CODE_LANGUAGES = ['CSS', 'Go', 'HTML', 'JavaScript', 'JSON', 'Markdown', 'Python', 'Rust', 'SQL', 'TypeScript']
const LIST_COLUMN_NAMES = ['Title', 'Author', 'Status', 'Published']

export function CustomFieldComponents() {
  const [selectedLanguage, setSelectedLanguage] = useState(CODE_LANGUAGES[0])
  const [selectedColumns, setSelectedColumns] = useState(['Title', 'Status'])

  const languageEntries: ComboboxEntry[] = CODE_LANGUAGES.map((language) => ({
    name: language,
    Component: <PopupList.Button onClick={() => setSelectedLanguage(language)}>{language}</PopupList.Button>
  }))

  const toggleColumn = (column: string) =>
    setSelectedColumns((columns) => (columns.includes(column) ? columns.filter((name) => name !== column) : [...columns, column]))

  return (
    <div className="field-type custom-field-components">
      <FieldLabel label="Components for custom fields" />
      <APIKeyInput aria-label="API key" value="demo-0f3a9c27-5b1e-4d8a-9e62-7c4b1a0d3f58" />
      <PillSelector
        onClick={({ pill }) => toggleColumn(pill.name)}
        pills={LIST_COLUMN_NAMES.map((name) => ({ Label: name, name, selected: selectedColumns.includes(name) }))}
      />
      <Combobox
        aria-label="Language"
        button={
          <Button buttonStyle="secondary" icon="chevron" iconPosition="right">
            {selectedLanguage}
          </Button>
        }
        buttonType="custom"
        entries={languageEntries}
        footer={({ close }) => <PopupList.Button onClick={close}>Add a language</PopupList.Button>}
        header={() => <PopupList.Button onClick={() => setSelectedLanguage(CODE_LANGUAGES[0])}>Reset to CSS</PopupList.Button>}
        searchPlaceholder="Search languages"
        size="large"
      />
      <DrawerContentContainer>
        <SidebarRow selected title="Selected sidebar row" />
        <SidebarRow title="Sidebar row" />
      </DrawerContentContainer>
    </div>
  )
}
