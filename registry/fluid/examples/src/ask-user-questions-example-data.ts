import type { AskUserQuestion } from '@foldkit-visuals/fluid/ask-user-questions'

export const questions: ReadonlyArray<AskUserQuestion> = [
  {
    id: 'role',
    title: "What's your role?",
    options: [
      { id: 'design', title: 'Designer', description: 'Visual / interaction' },
      { id: 'eng', title: 'Engineer', description: 'Frontend / backend' },
      { id: 'pm', title: 'PM', description: 'Product / program' },
      { id: 'research', title: 'Researcher', description: 'User / market research' },
    ],
  },
  {
    id: 'tools',
    title: 'Which tool do you use most?',
    options: [
      { id: 'figma', title: 'Figma', description: 'Design source of truth' },
      { id: 'vscode', title: 'VS Code', description: 'Code editor' },
      { id: 'linear', title: 'Linear', description: 'Issue tracker' },
      { id: 'notion', title: 'Notion', description: 'Docs and planning' },
    ],
  },
  {
    id: 'team',
    title: 'How big is your team?',
    options: [
      { id: 'solo', title: 'Just me', description: 'Solo founder or freelancer' },
      { id: 'small', title: '2–10', description: 'Small team or pod' },
      { id: 'mid', title: '11–50', description: 'A few cross-functional teams' },
      { id: 'large', title: '50+', description: 'Full org' },
    ],
  },
  {
    id: 'experience',
    title: 'How long have you been doing this?',
    options: [
      { id: 'lt1', title: 'Less than a year', description: 'Just getting started' },
      { id: '1to3', title: '1–3 years', description: 'Finding your rhythm' },
      { id: '3to7', title: '3–7 years', description: 'Comfortable in the craft' },
      { id: 'gt7', title: '7+ years', description: 'Seasoned' },
    ],
  },
]
