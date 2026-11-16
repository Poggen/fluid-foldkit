import type { IconName } from '@foldkit-visuals/fluid/icons'

export interface ThinkingRow {
  readonly label: string
  readonly icon: IconName
  readonly showIcon?: boolean
  readonly description?: string
  readonly streamText?: string
  readonly sources?: ReadonlyArray<string>
  readonly image?: string
  readonly summary?: string
  readonly details?: ReadonlyArray<string>
}

export interface ThinkingDemo {
  readonly id: string
  readonly title: string
  readonly header: string
  readonly delays: ReadonlyArray<number>
  readonly rows: ReadonlyArray<ThinkingRow>
}

export const demos: ReadonlyArray<ThinkingDemo> = [
  {
    id: 'basic',
    title: 'Basic',
    header: 'Thinking',
    delays: [],
    rows: [
      {
        label: 'Searched the web',
        icon: 'search',
      },
      {
        label: 'Read 3 sources',
        icon: 'globe',
        summary: 'Explored 6 files',
        details: [
          'Read accordion.tsx',
          'Read icon-context.tsx',
          'Read badge.tsx',
          'Read use-fluid-hover.ts',
          'Read components.ts',
          'Read postbuild-registry.mjs',
        ],
      },
      {
        label: 'Done',
        icon: 'check',
      },
    ],
  },
  {
    id: 'minimal',
    title: 'Minimal',
    header: 'Thinking',
    delays: [],
    rows: [
      {
        label: 'Ran a command',
        icon: 'dot',
        showIcon: false,
      },
      {
        label: 'Done',
        icon: 'dot',
        showIcon: false,
      },
    ],
  },
  {
    id: 'streaming',
    title: 'Streaming',
    header: 'Thinking',
    delays: [400, 1800, 3200, 4200, 5200],
    rows: [
      {
        label: 'Searching for micka.design',
        icon: 'search',
        sources: ['x.com', 'google.com', 'github.com'],
      },
      {
        label: 'Reading sources',
        icon: 'globe',
      },
      {
        label: 'Analyzing portfolio',
        icon: 'brain',
      },
      {
        label: 'Complete',
        icon: 'check',
      },
    ],
  },
  {
    id: 'text',
    title: 'Streaming Text',
    header: 'Thinking',
    delays: [400, 6000, 12_000, 18_000, 24_000, 30_000, 32_000],
    rows: [
      {
        label: 'Loading dataset',
        icon: 'dot',
        showIcon: false,
        streamText:
          'Establishing a connection to the data warehouse and streaming 2.4 million rows across 47 columns into a memory-mapped buffer. The source table spans three partitions dated from January through March, each containing roughly 800K records with nested JSON fields that need to be flattened before downstream processing can begin.',
      },
      {
        label: 'Validating schema',
        icon: 'dot',
        showIcon: false,
        streamText:
          'Running a full schema validation pass against the canonical type definitions. Checking that all 47 columns match their expected types, verifying nullability constraints on the 12 required fields, confirming foreign key references resolve correctly against the dimension tables, and flagging any new columns that appeared since the last successful run on March 15th.',
      },
      {
        label: 'Transforming records',
        icon: 'dot',
        showIcon: false,
        streamText:
          'Applying the full normalization pipeline: flattening nested address objects into discrete columns, deduplicating records that share the same composite key across partitions, converting all timestamps from mixed UTC and local offsets into a canonical ISO 8601 format, and running the currency conversion step for the 14 non-USD transaction currencies using the daily exchange rate snapshot.',
      },
      {
        label: 'Running quality checks',
        icon: 'dot',
        showIcon: false,
        streamText:
          "Executing 23 data quality assertions: verifying that output row counts fall within the expected 2% tolerance of the source, checking that the revenue distribution skew hasn't shifted beyond 1.5 standard deviations from the trailing 30-day average, confirming referential integrity against all five dimension tables, and ensuring that no single partition exceeds 40% of total volume which would indicate an upstream ingestion anomaly.",
      },
      {
        label: 'Writing output',
        icon: 'dot',
        showIcon: false,
        streamText:
          'Compressing the validated dataset into 847 Snappy-encoded Parquet files partitioned by region and date, uploading each file to the staging bucket with server-side encryption enabled, registering the new partition metadata in the Hive metastore, and triggering the downstream Airflow DAG that handles incremental merges into the production fact table.',
      },
      {
        label: 'Pipeline complete',
        icon: 'dot',
        showIcon: false,
      },
    ],
  },
  {
    id: 'images',
    title: 'With Images',
    header: 'Vision Agent',
    delays: [400, 1800, 3400, 5000, 6000],
    rows: [
      {
        label: 'Searching for reference',
        icon: 'search',
      },
      {
        label: 'Found screenshot',
        icon: 'image',
        image: 'Homepage screenshot',
      },
      {
        label: 'Analyzing layout',
        icon: 'brain',
        description: 'Inspecting spacing, typography scale, and color usage.',
      },
      {
        label: 'Analysis complete',
        icon: 'check',
      },
    ],
  },
  {
    id: 'full',
    title: 'Full Example',
    header: 'Research Agent',
    delays: [400, 1600, 2800, 3800, 5000, 6200, 7200],
    rows: [
      {
        label: 'Searching for profiles',
        icon: 'search',
        sources: ['x.com', 'instagram.com', 'github.com'],
      },
      {
        label: 'Found profile photo',
        icon: 'image',
        description: 'micka.design profile from x.com',
        image: 'Profile card',
      },
      {
        label: 'Reading portfolio',
        icon: 'globe',
        summary: 'Explored 4 pages',
        details: ['Read about.html', 'Read projects.html', 'Read resume.pdf', 'Read contact.html'],
      },
      {
        label: 'Searching for recent work',
        icon: 'search',
        sources: ['figma.com', 'behance.net', 'google.com'],
      },
      {
        label: 'Analyzing results',
        icon: 'brain',
        description: 'Compiling findings into a summary.',
      },
      {
        label: 'Research complete',
        icon: 'check',
      },
    ],
  },
]
