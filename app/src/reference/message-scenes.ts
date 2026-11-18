// Fluid Functionalism cc276ca0 InputMessage examples. MIT.
export const suggestions = [
  'What is Fluid Functionalism about?',
  'How does Micka tune the springs behind these animations?',
  'Install the InputMessage component in my project',
  'Draft a short thank-you note to Micka for this library',
]
export const sections = [
  { key: 'basic', title: 'Basic', height: 280 },
  { key: 'suggestions', title: 'Suggestions', height: 360 },
  { key: 'attachments', title: 'Attachments', height: 440 },
  { key: 'transcript', title: 'Scrolling conversation', height: 440 },
  { key: 'queued', title: 'Queued messages', height: 440 },
  { key: 'left', title: 'Left Slot Only', height: 280 },
  { key: 'right', title: 'Right Slot Only', height: 280 },
  { key: 'handler', title: 'Send Handler', height: 280 },
  { key: 'disabled', title: 'Disabled', height: 280 },
]
export const replyFor = (text: string) =>
  `Replying to “${text}”. Here's a fuller answer that streams in a word at a time so you can watch the queue release the next message.`
