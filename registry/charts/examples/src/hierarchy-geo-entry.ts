import { Program, Runtime } from 'foldkit'
import { HierarchyGeoFixtureBlock, hierarchyGeoLayer } from './hierarchy-geo.fixture'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

Runtime.run(
  Program.make({
    block: HierarchyGeoFixtureBlock,
    layer: hierarchyGeoLayer,
    container: document.getElementById('app'),
  }),
)
