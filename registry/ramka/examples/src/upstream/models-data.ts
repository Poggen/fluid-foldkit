/* @license Adapted from Ramka (MIT), Copyright (c) 2026 Artur Bień. */
const assetBase =
  'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@e124e8d8d7330a5372bc2b4d00d39a4a9d7997ea/Models'
export const products = [
  {
    id: 'shoe',
    name: 'Materials Variants Shoe',
    material: 'Leather · multi-variant',
    src: `${assetBase}/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb`,
  },
  {
    id: 'chair',
    name: 'Damask Chair',
    material: 'Purple & gold fabric',
    src: `${assetBase}/ChairDamaskPurplegold/glTF-Binary/ChairDamaskPurplegold.glb`,
  },
  {
    id: 'bottle',
    name: 'Water Bottle',
    material: 'Brushed metal',
    src: `${assetBase}/WaterBottle/glTF-Binary/WaterBottle.glb`,
  },
  {
    id: 'helmet',
    name: 'Damaged Helmet',
    material: 'Sci-fi prop',
    src: `${assetBase}/DamagedHelmet/glTF-Binary/DamagedHelmet.glb`,
  },
] as const
export type Product = (typeof products)[number]
