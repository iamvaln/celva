import {
  Datagrid,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
} from 'react-admin';
import type { ProductAttributeValue, ProductAttribute } from '../../types';

const filters = [
  <ReferenceInput
    key="attributeId"
    source="attributeId"
    reference="attributes"
    perPage={100}
    alwaysOn
  >
    <SelectInput
      optionText={(a: ProductAttribute) =>
        `${a.name?.fr ?? ''} / ${a.name?.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
      }
    />
  </ReferenceInput>,
];

export const AttributeValueList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ReferenceField source="attributeId" reference="attributes" link={false}>
        <FunctionField
          render={(a: ProductAttribute) =>
            `${a.name?.fr ?? ''} / ${a.name?.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
          }
        />
      </ReferenceField>
      <FunctionField
        label="resources.attribute-values.fields.value"
        render={(record: ProductAttributeValue) =>
          `${record.value.fr ?? ''} / ${record.value.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <FunctionField
        label="resources.attribute-values.fields.color_hex"
        render={(record: ProductAttributeValue) =>
          record.colorHex ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: record.colorHex,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              {record.colorHex}
            </span>
          ) : (
            '—'
          )
        }
      />
      <NumberField source="sortOrder" />
    </Datagrid>
  </List>
);
