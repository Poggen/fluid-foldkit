import { bannerCopy, type Configuration } from './banner'
export const bannerCode = (
  c: Configuration,
) => `import { BannerBlock, BannerTitle, BannerDescription, BannerActions, BannerAction, createBannerMotionScope } from '@foldkit-visuals/fluid/banner'

const Banner = Page.makeRequiredFieldBinding(BannerBlock, { field: 'banner', init: { contextToArgs: () => [{ id: 'banner', reduceMotion: false }] } })
const motion = createBannerMotionScope()

Banner.embedView({ slotId: 'banner', model: model.banner, viewInputs: {
  context, variant: '${c.variant}', status: '${c.status}', contrast: '${c.contrast}', dismissible: ${c.dismissible}, animate: motion.node,
  children: () => [
    BannerTitle({ context, children: [${JSON.stringify(c.label || bannerCopy[c.status][0])}] }, h),
    ${c.description ? `BannerDescription({ context, children: [${JSON.stringify(bannerCopy[c.status][1])}] }, h),` : ''}
    ${c.primary || c.secondary || c.ghost ? `BannerActions({ context, children: [${[c.primary ? `BannerAction({ context, variant: 'primary', children: [${JSON.stringify(bannerCopy[c.status][2])}], attributes: [h.OnClick(Message.PrimaryAction())] }, h)` : '', c.secondary ? `BannerAction({ context, children: [${JSON.stringify(bannerCopy[c.status][3])}], attributes: [h.OnClick(Message.SecondaryAction())] }, h)` : '', c.ghost ? `BannerAction({ context, variant: 'ghost', children: [${JSON.stringify(bannerCopy[c.status][4])}], attributes: [h.OnClick(Message.Dismissed())] }, h)` : ''].filter(Boolean).join(', ')}] }, h),` : ''}
  ],
} })`
