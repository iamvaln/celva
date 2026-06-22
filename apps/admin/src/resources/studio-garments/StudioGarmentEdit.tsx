import {
  AutocompleteInput,
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';

export const StudioGarmentEdit = () => (
  <Edit redirect="list" mutationMode="pessimistic">
    <SimpleForm>
      <ReferenceInput source="familyId" reference="studio-families">
        <AutocompleteInput
          optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
          validate={[required()]}
        />
      </ReferenceInput>
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <TextInput source="description.fr" multiline minRows={2} fullWidth />
      <TextInput source="description.en" multiline minRows={2} fullWidth />
      <NumberInput source="sortOrder" min={0} />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
