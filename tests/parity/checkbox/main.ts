import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { Config, block, layer } from './application.js'
import '../../../app/src/styles.css'

const query = new URLSearchParams(window.location.search)
const flag = (key: string) => query.get(key) === 'true'
Runtime.run(
  Program.make({ block, layer, Flags: Config, container: document.getElementById('root') }),
  {
    flags: Effect.succeed({
      checked: flag('checked'),
      indeterminate: flag('indeterminate'),
      disabled: flag('disabled'),
      readOnly: flag('readOnly'),
      refuse: flag('refuse'),
      required: flag('required'),
      card: flag('card'),
      compact: flag('compact'),
      sharp: flag('sharp'),
      reduced: flag('reduced'),
    }),
  },
)
