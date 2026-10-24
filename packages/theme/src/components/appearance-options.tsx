'use client'

import { PopupList } from '@payloadcms/ui'

import { type AppearanceControl, appearanceControls } from '../lib/appearance.js'
import { useAppearance } from './appearance-provider.js'

export function AppearanceOptions({ control }: { control: AppearanceControl }) {
  const { appearance, setControl } = useAppearance()

  return (
    <div data-popup-prevent-close>
      <PopupList.RadioGroup>
        {Object.entries(appearanceControls[control].options).map(([value, label]) => (
          <PopupList.RadioGroupItem active={appearance[control] === value} key={value} onClick={() => setControl(control, value)}>
            {label}
          </PopupList.RadioGroupItem>
        ))}
      </PopupList.RadioGroup>
    </div>
  )
}
