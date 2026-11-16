import { Program, Runtime } from 'foldkit'
import {
  CarouselDotsExampleBlock,
  createCarouselDotsExample,
} from './carousel-dots-example-block.js'
import './primitives.css'

const container = document.querySelector<HTMLDivElement>('#root')
if (container === null) throw new Error('Missing CarouselDots root')
const example = createCarouselDotsExample()
Runtime.embed(
  Program.makeElement({
    block: CarouselDotsExampleBlock,
    layer: example.layer,
    container,
  }).provide({ services: example.resources }),
)
