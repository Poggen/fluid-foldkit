import { Schema } from 'effect'
import { Program, Runtime } from 'foldkit'
import {
  PublicBarSkeletonHostBlock,
  PublicBarSkeletonHostLayer,
  initialBarLoadingSkeletonPreference,
} from './bar-skeleton-public'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

Runtime.run(
  Program.make({
    block: PublicBarSkeletonHostBlock,
    layer: PublicBarSkeletonHostLayer,
    Flags: Schema.Boolean,
    container: document.querySelector<HTMLElement>('#root'),
  }),
  { flags: initialBarLoadingSkeletonPreference },
)
