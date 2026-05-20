import { Admin, Resource } from 'react-admin';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import { dataProvider } from './dataProvider';
import { authProvider } from './authProvider';
import { i18nProvider } from './i18nProvider';
import { celvaLightTheme, celvaDarkTheme } from './theme';
import { CelvaLogin } from './components/CelvaLogin';
import { CelvaLayout } from './components/CelvaLayout';
import { UserList } from './resources/users/UserList';
import { UserEdit } from './resources/users/UserEdit';
import { UserCreate } from './resources/users/UserCreate';
import { UserShow } from './resources/users/UserShow';
import { SettingList } from './resources/settings/SettingList';
import { SettingEdit } from './resources/settings/SettingEdit';
import { SettingCreate } from './resources/settings/SettingCreate';

export const App = () => (
  <Admin
    title="Celva Admin"
    dataProvider={dataProvider}
    authProvider={authProvider}
    i18nProvider={i18nProvider}
    loginPage={CelvaLogin}
    layout={CelvaLayout}
    theme={celvaLightTheme}
    darkTheme={celvaDarkTheme}
    requireAuth
    disableTelemetry
  >
    {(permissions) => (
      <>
        <Resource
          name="users"
          icon={PeopleIcon}
          list={UserList}
          edit={permissions === 'ADMIN' ? UserEdit : undefined}
          create={permissions === 'ADMIN' ? UserCreate : undefined}
          show={UserShow}
        />
        <Resource
          name="settings"
          icon={SettingsIcon}
          list={SettingList}
          edit={permissions === 'ADMIN' ? SettingEdit : undefined}
          create={permissions === 'ADMIN' ? SettingCreate : undefined}
        />
      </>
    )}
  </Admin>
);
