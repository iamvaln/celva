import { useState } from 'react';
import {
  BooleanField,
  Button,
  Edit,
  Labeled,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  TopToolbar,
  regex,
  required,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from 'react-admin';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import type { Article } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const ARTICLE_CATEGORIES = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'] as const;

const PublishButton = () => {
  const record = useRecordContext<Article>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [busy, setBusy] = useState(false);
  if (!record) return null;

  const action = record.isPublished ? 'unpublish' : 'publish';
  const Icon = record.isPublished ? UnpublishedIcon : PublishIcon;

  const onClick = async () => {
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/articles/admin/${record.id}/${action}`, {
        method: 'POST',
      });
      notify(
        record.isPublished
          ? 'resources.articles.notifications.unpublished'
          : 'resources.articles.notifications.published',
        { type: 'success' },
      );
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={
        record.isPublished
          ? 'resources.articles.actions.unpublish'
          : 'resources.articles.actions.publish'
      }
      onClick={onClick}
      startIcon={<Icon />}
      disabled={busy}
    />
  );
};

const Actions = () => (
  <TopToolbar>
    <PublishButton />
  </TopToolbar>
);

export const ArticleEdit = () => (
  <Edit mutationMode="pessimistic" actions={<Actions />}>
    <SimpleForm>
      <Labeled label="resources.articles.fields.isPublished">
        <BooleanField source="isPublished" />
      </Labeled>
      <Labeled label="resources.articles.fields.publishedAt">
        <TextField source="publishedAt" />
      </Labeled>
      <TextInput source="title.fr" validate={[required()]} fullWidth />
      <TextInput source="title.en" validate={[required()]} fullWidth />
      <TextInput
        source="slug"
        validate={[
          required(),
          regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.articles.errors.invalid_slug'),
        ]}
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
        minRows={12}
        helperText="resources.articles.helpers.content_markdown"
        fullWidth
        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
      />
      <TextInput
        source="content.en"
        validate={[required()]}
        multiline
        minRows={12}
        fullWidth
        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
      />
    </SimpleForm>
  </Edit>
);
