import { Context, Effect, Schema } from 'effect'
export const ReferenceData = Schema.Struct({
  family: Schema.String,
  name: Schema.String,
  entry: Schema.String,
  contracts: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      props: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          type: Schema.String,
          optional: Schema.Boolean,
          description: Schema.String,
          defaultValue: Schema.NullOr(Schema.String),
        }),
      ),
    }),
  ),
  files: Schema.Array(Schema.Struct({ path: Schema.String, content: Schema.String })),
})
export class ReferenceUnavailable extends Schema.TaggedError<ReferenceUnavailable>()(
  'ReferenceUnavailable',
  { message: Schema.String },
) {}
export class ReferenceClient extends Context.Service<
  ReferenceClient,
  {
    readonly load: (
      family: string,
      slug: string,
    ) => Effect.Effect<typeof ReferenceData.Type, ReferenceUnavailable>
  }
>()('ComponentReferenceClient') {}
