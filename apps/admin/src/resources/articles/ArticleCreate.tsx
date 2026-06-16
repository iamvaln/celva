import { Create } from 'react-admin';
import { CelvaSkin } from '../../components/CelvaSkin';
import { ArticleForm } from './ArticleForm';

/**
 * New-article authoring. Reuses the bespoke bilingual `ArticleForm` in
 * "create" mode — saves via `useCreate`, then redirects to the list.
 */
export const ArticleCreate = () => (
  <Create component="div" actions={false}>
    <CelvaSkin>
      <div style={{ padding: '8px 4px 64px' }}>
        <ArticleForm mode="create" />
      </div>
    </CelvaSkin>
  </Create>
);
