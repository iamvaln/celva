import {
  BooleanField,
  ChipField,
  DateField,
  EmailField,
  EditButton,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
} from 'react-admin';

const UserShowActions = () => (
  <TopToolbar>
    <EditButton />
  </TopToolbar>
);

export const UserShow = () => (
  <Show actions={<UserShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <EmailField source="email" />
      <ChipField source="role" />
      <BooleanField source="isActive" />
      <TextField source="phone" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);
