import {
  Create,
  SelectInput,
  SimpleForm,
  TextInput,
  regex,
  required,
} from 'react-admin';

const ARTICLE_CATEGORIES = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'] as const;

/** Admin authoring. Content is markdown — rendered safely on the storefront. */
export const ArticleCreate = () => (
  <Create redirect="edit">
    <SimpleForm>
      <TextInput source="title.fr" validate={[required()]} fullWidth />
      <TextInput source="title.en" validate={[required()]} fullWidth />
      <TextInput
        source="slug"
        validate={[
          required(),
          regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.articles.errors.invalid_slug'),
        ]}
        helperText="resources.articles.helpers.slug"
        fullWidth
      />
      <SelectInput
        source="category"
        choices={ARTICLE_CATEGORIES.map((c) => ({ id: c, name: c }))}
        validate={[required()]}
      />
      <TextInput
        source="coverImage"
        helperText="resources.articles.helpers.cover_image"
        fullWidth
      />
      <TextInput
        source="excerpt.fr"
        multiline
        minRows={2}
        helperText="resources.articles.helpers.excerpt"
        fullWidth
      />
      <TextInput source="excerpt.en" multiline minRows={2} fullWidth />
      <TextInput
        source="content.fr"
        validate={[required()]}
        multiline
        minRows={10}
        helperText="resources.articles.helpers.content_markdown"
        fullWidth
        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
      />
      <TextInput
        source="content.en"
        validate={[required()]}
        multiline
        minRows={10}
        fullWidth
        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
      />
    </SimpleForm>
  </Create>
);
