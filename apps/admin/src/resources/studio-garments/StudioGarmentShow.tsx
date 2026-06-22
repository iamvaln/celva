import {
  EditButton,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  useRecordContext,
} from 'react-admin';
import { Box, Stack, Typography } from '@mui/material';
import type { StudioGarment } from '../../types';

const Header = () => {
  const record = useRecordContext<StudioGarment>();
  if (!record) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="h6">{record.name?.fr ?? '—'}</Typography>
      {record.description?.fr && (
        <Typography variant="body2" color="text.secondary">
          {record.description.fr}
        </Typography>
      )}
    </Stack>
  );
};

const PhotoGallery = () => {
  const record = useRecordContext<StudioGarment>();
  if (!record) return null;
  const photos = record.photos ?? [];
  if (photos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune photo. Ajoutez-en depuis la ressource « Studio · Photos ».
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {photos.map((p) => (
        <Box key={p.id} sx={{ width: 160 }}>
          <Box
            component="img"
            src={p.imageKey}
            alt=""
            sx={{ width: 160, height: 200, objectFit: 'cover', display: 'block' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {p.angle ?? '—'} · #{p.sortOrder}
            {!p.isActive && ' · inactif'}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

export const StudioGarmentShow = () => (
  <Show
    actions={
      <TopToolbar>
        <EditButton />
      </TopToolbar>
    }
  >
    <SimpleShowLayout>
      <Header />
      <ReferenceField source="familyId" reference="studio-families" link="show" label="resources.studio-garments.fields.family">
        <FunctionField render={(r) => r?.name?.fr ?? r?.slug ?? '—'} />
      </ReferenceField>
      <PhotoGallery />
    </SimpleShowLayout>
  </Show>
);
