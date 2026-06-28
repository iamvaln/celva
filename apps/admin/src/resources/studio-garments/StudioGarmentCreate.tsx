import {
  AutocompleteInput,
  BooleanInput,
  Create,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { SortOrderInput } from '../../components/SortOrderInput';

export const StudioGarmentCreate = () => (
  <Create redirect="list">
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
      <SortOrderInput defaultValue={0} />
      <BooleanInput source="isActive" defaultValue={true} />
    </SimpleForm>
  </Create>
);
