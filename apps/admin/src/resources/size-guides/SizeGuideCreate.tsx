import {
  Create,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';

const markdownSx = { '& textarea': { fontFamily: 'monospace', fontSize: 13 } };

export const SizeGuideCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <ReferenceInput source="categoryId" reference="categories" perPage={100}>
        <SelectInput
          optionText={(c: { name?: { fr?: string } }) => c.name?.fr ?? ''}
          validate={[required()]}
        />
      </ReferenceInput>
      <TextInput
        source="content.fr"
        validate={[required()]}
        multiline
        minRows={10}
        helperText="resources.size-guides.helpers.content_markdown"
        fullWidth
        sx={markdownSx}
      />
      <TextInput
        source="content.en"
        validate={[required()]}
        multiline
        minRows={10}
        fullWidth
        sx={markdownSx}
      />
    </SimpleForm>
  </Create>
);
