import {
  AutocompleteInput,
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';

const ANGLES = ['FRONT', 'SIDE', 'BACK', 'DETAIL'] as const;

export const StudioModelCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <ReferenceInput source="garmentId" reference="studio-garments">
        <AutocompleteInput
          optionText={(record) => record?.name?.fr ?? '—'}
          validate={[required()]}
        />
      </ReferenceInput>
      <ImageDropInput
        source="imageKey"
        aspectRatio={3 / 4}
        helperText="resources.studio-models.helpers.image"
      />
      <TextInput source="caption.fr" fullWidth />
      <TextInput source="caption.en" fullWidth />
      <SelectInput
        source="angle"
        choices={ANGLES.map((a) => ({ id: a, name: a }))}
        emptyText="—"
      />
      <NumberInput source="sortOrder" min={0} defaultValue={0} />
      <BooleanInput source="isActive" defaultValue={true} />
    </SimpleForm>
  </Create>
);
