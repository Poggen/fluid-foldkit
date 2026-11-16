import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@source/registry/radix/accordion'
import '@source/app/globals.css'
import '../source-style.css'
const root = document.getElementById('root')
if (!root) throw Error('Missing comparison host')
const tags: Array<string> = []
const capture = (node: HTMLElement | null) => {
  if (node) tags.push(node.tagName)
  root.dataset.callerRefTags = JSON.stringify(tags)
}
createRoot(root).render(
  <Accordion defaultValue="entry">
    <AccordionItem value="entry" ref={capture}>
      <AccordionTrigger ref={capture}>Reference target</AccordionTrigger>
      <AccordionContent ref={capture}>Content target</AccordionContent>
    </AccordionItem>
  </Accordion>,
)
