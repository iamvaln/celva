import { Edit } from 'react-admin';
import { CelvaSkin } from '../../components/CelvaSkin';
import { ArticleForm } from './ArticleForm';

/**
 * Bespoke bilingual article editor (Journal). Renders the brand-skinned
 * design inside an RA `<Edit>` shell — record context flows to `ArticleForm`,
 * which saves via `useUpdate` and reuses the publish endpoint.
 */
export const ArticleEdit = () => (
  <Edit component="div" actions={false} mutationMode="pessimistic">
    <CelvaSkin>
      <div style={{ padding: '8px 4px 64px' }}>
        <ArticleForm mode="edit" />
      </div>
    </CelvaSkin>
  </Edit>
);
