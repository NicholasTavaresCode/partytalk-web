import type {
  IeltsModuleInfo,
  ListeningTest,
  ReadingTest,
  SpeakingTest,
  WritingTask,
} from "@/lib/types";

const delay = <T>(value: T, ms = 0): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const IELTS_MODULES: IeltsModuleInfo[] = [
  {
    id: "listening",
    title: "Listening",
    duration: "30 min",
    questions: "40 questions",
    blurb: "Four recorded sections, played once. Fill forms, complete notes and answer multiple choice.",
    skills: ["Form completion", "Multiple choice", "Note taking"],
  },
  {
    id: "reading",
    title: "Reading",
    duration: "60 min",
    questions: "40 questions",
    blurb: "Three long passages with split-screen questions: heading matching, True/False/Not Given and more.",
    skills: ["Heading matching", "Skimming", "Detail hunting"],
  },
  {
    id: "writing",
    title: "Writing",
    duration: "60 min",
    questions: "2 tasks",
    blurb: "Describe a chart in Task 1, then argue a position in a Task 2 essay. Live word count included.",
    skills: ["Data description", "Essay structure", "Cohesion"],
  },
  {
    id: "speaking",
    title: "Speaking",
    duration: "11–14 min",
    questions: "3 parts",
    blurb: "A face-to-face style interview with the AI examiner: introduction, a long turn, and discussion.",
    skills: ["Fluency", "Long turn", "Discussion"],
  },
];

export async function fetchIeltsModules(): Promise<IeltsModuleInfo[]> {
  return delay(IELTS_MODULES);
}

/* --------------------------------- Listening -------------------------------- */

export const LISTENING_TEST: ListeningTest = {
  part: 1,
  instructions: "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
  totalQuestions: 40,
  currentQuestion: 6,
  answered: [1, 2, 3, 4, 5],
  audio: {
    title: "Section 1 — Customer service call",
    duration: "05:42",
    note: "Note: You will hear the recording once only.",
  },
  form: {
    title: "Customer Satisfaction Survey",
    fields: [
      { n: 1, label: "Customer name", placeholder: "Enter name" },
      { n: 2, label: "Phone number", placeholder: "Enter number" },
    ],
    table: {
      columns: ["Service item", "Comments"],
      rows: [
        { n: 3, item: "Food Quality", placeholder: "Type here" },
        { n: 4, item: "Staff Knowledge", placeholder: "Type here" },
        { n: 5, item: "Wait Time", placeholder: "Type here" },
      ],
    },
  },
  mcqs: [
    {
      n: 6,
      prompt: "Why did the customer visit the store today?",
      options: [
        { value: "A", label: "To make a new purchase" },
        { value: "B", label: "To return a faulty item" },
        { value: "C", label: "To ask for technical support" },
      ],
    },
    {
      n: 7,
      prompt: "How often does the customer visit the area?",
      options: [
        { value: "A", label: "Once a week" },
        { value: "B", label: "Twice a month" },
        { value: "C", label: "Very rarely" },
      ],
    },
    {
      n: 8,
      prompt: "What does the customer like most about the service?",
      options: [
        { value: "A", label: "The opening hours" },
        { value: "B", label: "The friendly staff" },
        { value: "C", label: "The low prices" },
      ],
    },
  ],
};

export async function fetchListeningTest(): Promise<ListeningTest> {
  return delay(LISTENING_TEST);
}

/* ---------------------------------- Reading --------------------------------- */

export const READING_TEST: ReadingTest = {
  passageNumber: 1,
  passageTitle: "The History of Language Evolution",
  paragraphs: [
    {
      label: "A",
      text: "The origin of human language has been a topic of scholarly debate for centuries. Unlike fossil records that provide tangible evidence of physical evolution, the spoken word leaves no trace in the archaeological record. Researchers must therefore rely on indirect evidence, such as the development of the human vocal tract and the emergence of symbolic art, to piece together when our ancestors first began to communicate through complex syntax.",
    },
    {
      label: "B",
      text: "One prevailing theory suggests that language evolved from manual gestures. Proponents of this “gestural theory” argue that our primate cousins use hand signals far more flexibly than vocalizations. It is hypothesized that as early humans began to walk upright, their hands were freed for increasingly sophisticated signaling, eventually being supplemented and then replaced by vocal sounds as the primary mode of transmission.",
    },
    {
      label: "C",
      text: "Another school of thought, championed by Noam Chomsky, posits that the capacity for language is an innate biological trait unique to humans. According to this “universal grammar” theory, children are born with a structural “blueprint” in their brains that allows them to acquire language rapidly without formal instruction. This suggests a sudden genetic mutation rather than a slow, incremental evolution over millions of years.",
    },
    {
      label: "D",
      text: "Environmental factors also played a crucial role. As human populations migrated across diverse landscapes, they encountered new flora, fauna, and social structures. The need to coordinate group activities, such as hunting large prey or sharing medicinal knowledge, exerted selective pressure on early hominids to develop more precise communication tools. This socio-biological synergy acted as a catalyst for linguistic expansion.",
    },
    {
      label: "E",
      text: "Modern neuroimaging has added a new dimension to the debate. By studying the brain activity of contemporary speakers, scientists can identify specific regions—such as Broca's area and Wernicke's area—that are dedicated to processing grammar and meaning. Comparative studies with other species show that while some animals possess precursors to these regions, the intricate connectivity found in the human brain is unparalleled.",
    },
    {
      label: "F",
      text: "The transition from proto-language to modern languages likely occurred during the Upper Paleolithic period. The explosion of cultural artifacts, including cave paintings and ornate tools, suggests a leap in cognitive ability. This “Creative Explosion” is often linked to the full development of recursive language, allowing humans to discuss abstract concepts, past events, and future possibilities.",
    },
    {
      label: "G",
      text: "Despite these advancements, many mysteries remain. The sheer diversity of the world's 7,000 languages continues to challenge unified theories of evolution. As some languages face extinction and new dialects emerge through digital interaction, the study of language evolution remains a dynamic field, constantly bridging the gap between our biological past and our technological future.",
    },
  ],
  questionRange: "Questions 1-7",
  headingInstructions:
    "The reading passage has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list of headings below. Write the correct number, i–x, in boxes 1–7 on your answer sheet.",
  headings: [
    { numeral: "i", text: "The influence of physical surroundings" },
    { numeral: "ii", text: "The role of manual communication" },
    { numeral: "iii", text: "A sudden genetic leap" },
    { numeral: "iv", text: "The lack of direct historical evidence" },
    { numeral: "v", text: "The impact of modern technology on dialects" },
    { numeral: "vi", text: "Neurological foundations of speech" },
    { numeral: "vii", text: "Symbolic art as a linguistic indicator" },
    { numeral: "viii", text: "The necessity of group coordination" },
    { numeral: "ix", text: "Challenges in finding a unified theory" },
    { numeral: "x", text: "Primate vocalization versus human speech" },
  ],
  matches: [
    { n: 1, paragraph: "Paragraph A" },
    { n: 2, paragraph: "Paragraph B" },
    { n: 3, paragraph: "Paragraph C" },
    { n: 4, paragraph: "Paragraph D" },
    { n: 5, paragraph: "Paragraph E" },
    { n: 6, paragraph: "Paragraph F" },
    { n: 7, paragraph: "Paragraph G" },
  ],
  totalQuestions: 40,
  currentQuestion: 1,
};

export async function fetchReadingTest(): Promise<ReadingTest> {
  return delay(READING_TEST);
}

/* ---------------------------------- Writing --------------------------------- */

export const WRITING_TASKS: WritingTask[] = [
  {
    id: 1,
    label: "Task 1",
    minutes: 20,
    minWords: 150,
    prompt:
      "The graph below shows the average monthly rainfall (in millimeters) in three different cities throughout the year 2023.",
    emphasis:
      "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    chart: {
      caption: "Figure 1: Average Monthly Rainfall (mm) — 2023",
      unit: "mm",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      series: [
        { name: "Lisbon", color: "#003366", values: [110, 95, 75, 60, 45, 20, 8, 10, 35, 85, 120, 130] },
        { name: "Nairobi", color: "#bb0027", values: [60, 55, 95, 190, 160, 40, 18, 22, 30, 70, 150, 100] },
        { name: "Singapore", color: "#c9a900", values: [240, 160, 175, 185, 170, 160, 155, 175, 180, 205, 255, 285] },
      ],
    },
  },
  {
    id: 2,
    label: "Task 2",
    minutes: 40,
    minWords: 250,
    prompt:
      "Some people believe that remote working benefits both employees and employers, while others think it damages collaboration and company culture.",
    emphasis:
      "Discuss both views and give your own opinion. Give reasons for your answer and include relevant examples from your own knowledge or experience.",
  },
];

export async function fetchWritingTasks(): Promise<WritingTask[]> {
  return delay(WRITING_TASKS);
}

/* --------------------------------- Speaking --------------------------------- */

export const SPEAKING_TEST: SpeakingTest = {
  examiner: "AI Examiner",
  activePart: 1,
  parts: [
    {
      id: 1,
      label: "Part 1: Introduction",
      title: "Introduction & interview",
      current: { n: 1, text: "Tell me about your hometown." },
      questions: [
        "Tell me about your hometown.",
        "What do you like most about living there?",
        "Has it changed much since you were a child?",
        "Would you recommend it to a tourist? Why?",
      ],
    },
    {
      id: 2,
      label: "Part 2: Long turn",
      title: "The cue card",
      current: { n: 1, text: "Describe a place you like to spend your free time." },
      questions: [],
      cueCard: {
        task: "Describe a place you like to spend your free time.",
        bullets: [
          "where it is",
          "how often you go there",
          "what you do there",
          "and explain why you like it.",
        ],
      },
    },
    {
      id: 3,
      label: "Part 3: Discussion",
      title: "Two-way discussion",
      current: { n: 1, text: "How have public spaces in cities changed in recent years?" },
      questions: [
        "How have public spaces in cities changed in recent years?",
        "Do you think cities provide enough places to relax?",
        "Should governments invest more in public spaces?",
      ],
    },
  ],
};

export async function fetchSpeakingTest(): Promise<SpeakingTest> {
  return delay(SPEAKING_TEST);
}
