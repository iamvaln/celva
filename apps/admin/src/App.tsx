import { Admin, Resource } from 'react-admin';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory2';
import TuneIcon from '@mui/icons-material/Tune';
import StyleIcon from '@mui/icons-material/Style';
import CollectionsIcon from '@mui/icons-material/Collections';
import LayersIcon from '@mui/icons-material/Layers';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';
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
import { CategoryList } from './resources/categories/CategoryList';
import { CategoryEdit } from './resources/categories/CategoryEdit';
import { CategoryCreate } from './resources/categories/CategoryCreate';
import { ProductList } from './resources/products/ProductList';
import { ProductEdit } from './resources/products/ProductEdit';
import { ProductCreate } from './resources/products/ProductCreate';
import { AttributeList } from './resources/product-attributes/AttributeList';
import { AttributeEdit } from './resources/product-attributes/AttributeEdit';
import { AttributeCreate } from './resources/product-attributes/AttributeCreate';
import { AttributeValueList } from './resources/attribute-values/AttributeValueList';
import { AttributeValueEdit } from './resources/attribute-values/AttributeValueEdit';
import { AttributeValueCreate } from './resources/attribute-values/AttributeValueCreate';
import { CollectionList } from './resources/collections/CollectionList';
import { CollectionEdit } from './resources/collections/CollectionEdit';
import { CollectionCreate } from './resources/collections/CollectionCreate';
import { VariantList } from './resources/variants/VariantList';
import { VariantEdit } from './resources/variants/VariantEdit';
import { VariantCreate } from './resources/variants/VariantCreate';
import { PromoCodeList } from './resources/promo-codes/PromoCodeList';
import { PromoCodeEdit } from './resources/promo-codes/PromoCodeEdit';
import { PromoCodeCreate } from './resources/promo-codes/PromoCodeCreate';
import { DeliveryZoneList } from './resources/delivery-zones/DeliveryZoneList';
import { DeliveryZoneEdit } from './resources/delivery-zones/DeliveryZoneEdit';
import { DeliveryZoneCreate } from './resources/delivery-zones/DeliveryZoneCreate';
import { PickupPointList } from './resources/pickup-points/PickupPointList';
import { PickupPointEdit } from './resources/pickup-points/PickupPointEdit';
import { PickupPointCreate } from './resources/pickup-points/PickupPointCreate';

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
          name="categories"
          icon={CategoryIcon}
          list={CategoryList}
          edit={CategoryEdit}
          create={CategoryCreate}
        />
        <Resource
          name="products"
          icon={InventoryIcon}
          list={ProductList}
          edit={ProductEdit}
          create={ProductCreate}
        />
        <Resource
          name="attributes"
          icon={TuneIcon}
          list={AttributeList}
          edit={AttributeEdit}
          create={AttributeCreate}
          options={{ label: 'Attributs' }}
        />
        <Resource
          name="attribute-values"
          icon={StyleIcon}
          list={AttributeValueList}
          edit={AttributeValueEdit}
          create={AttributeValueCreate}
          options={{ label: 'Valeurs attribut' }}
        />
        <Resource
          name="variants"
          icon={LayersIcon}
          list={VariantList}
          edit={VariantEdit}
          create={VariantCreate}
        />
        <Resource
          name="collections"
          icon={CollectionsIcon}
          list={CollectionList}
          edit={CollectionEdit}
          create={CollectionCreate}
        />
        <Resource
          name="promo-codes"
          icon={LocalOfferIcon}
          list={PromoCodeList}
          edit={permissions === 'ADMIN' ? PromoCodeEdit : undefined}
          create={permissions === 'ADMIN' ? PromoCodeCreate : undefined}
          options={{ label: 'Codes promo' }}
        />
        <Resource
          name="delivery-zones"
          icon={LocalShippingIcon}
          list={DeliveryZoneList}
          edit={permissions === 'ADMIN' ? DeliveryZoneEdit : undefined}
          create={permissions === 'ADMIN' ? DeliveryZoneCreate : undefined}
          options={{ label: 'Zones de livraison' }}
        />
        <Resource
          name="pickup-points"
          icon={StorefrontIcon}
          list={PickupPointList}
          edit={PickupPointEdit}
          create={PickupPointCreate}
          options={{ label: 'Points de retrait' }}
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
