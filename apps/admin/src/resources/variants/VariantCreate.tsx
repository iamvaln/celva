import { useEffect, useState } from 'react';
import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useGetList,
  useTranslate,
} from 'react-admin';
import { useWatch, useFormContext } from 'react-hook-form';
import type { ProductAttribute, ProductAttributeValue } from '../../types';

/**
 * Once a product is picked, fetch its attributes + values and render one
 * SelectInput per attribute. They write into form state under
 * `attributeValueIds.<index>`; we collapse them to a string[] in `transform`.
 */
const PerAttributePicker = () => {
  const productId = useWatch({ name: 'productId' }) as string | undefined;
  const { setValue } = useFormContext();
  const translate = useTranslate();

  const { data: attributes = [], isLoading } = useGetList<ProductAttribute>(
    'attributes',
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: 'sortOrder', order: 'ASC' },
      filter: { productId },
    },
    { enabled: Boolean(productId) },
  );

  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    setPicks({});
    setValue('attributeValueIds', []);
  }, [productId, setValue]);

  useEffect(() => {
    setValue(
      'attributeValueIds',
      attributes.map((a) => picks[a.id]).filter(Boolean),
    );
  }, [picks, attributes, setValue]);

  if (!productId) {
    return (
      <p style={{ opacity: 0.7 }}>
        {translate('resources.variants.helpers.pick_product_first')}
      </p>
    );
  }
  if (isLoading) return null;
  if (attributes.length === 0) {
    return (
      <p style={{ opacity: 0.7 }}>
        {translate('resources.variants.helpers.product_has_no_attributes')}
      </p>
    );
  }

  return (
    <>
      {attributes.map((attr) => (
        <AttributeValueSelect
          key={attr.id}
          attribute={attr}
          value={picks[attr.id] ?? ''}
          onChange={(value) => setPicks((p) => ({ ...p, [attr.id]: value }))}
        />
      ))}
    </>
  );
};

const AttributeValueSelect = ({
  attribute,
  value,
  onChange,
}: {
  attribute: ProductAttribute;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { data: values = [] } = useGetList<ProductAttributeValue>('attribute-values', {
    pagination: { page: 1, perPage: 200 },
    sort: { field: 'sortOrder', order: 'ASC' },
    filter: { attributeId: attribute.id },
  });

  return (
    <SelectInput
      source={`__attr_${attribute.id}`}
      label={`${attribute.name.fr} / ${attribute.name.en}`}
      choices={values.map((v) => ({
        id: v.id,
        name: `${v.value.fr} / ${v.value.en}`.replace(/^ \/ | \/ $/g, ''),
      }))}
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      validate={[required()]}
    />
  );
};

export const VariantCreate = () => {
  return (
    <Create
      redirect="list"
      transform={(data) => {
        const copy = { ...data } as Record<string, unknown>;
        Object.keys(copy)
          .filter((k) => k.startsWith('__attr_'))
          .forEach((k) => delete copy[k]);
        return copy;
      }}
    >
      <SimpleForm>
        <ReferenceInput source="productId" reference="products" perPage={50}>
          <SelectInput
            optionText={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''}
            validate={[required()]}
          />
        </ReferenceInput>
        <TextInput
          source="sku"
          helperText="resources.variants.helpers.sku"
          validate={[
            required(),
            regex(/^[A-Z0-9][A-Z0-9._-]{1,49}$/, 'resources.variants.errors.invalid_sku'),
          ]}
          fullWidth
        />
        <PerAttributePicker />
        <NumberInput
          source="initialStock"
          helperText="resources.variants.helpers.initial_stock"
          defaultValue={0}
          validate={[minValue(0)]}
        />
        <NumberInput
          source="priceOverride"
          helperText="resources.variants.helpers.price_override"
          validate={[minValue(0)]}
        />
        <TextInput
          source="storageLocation"
          helperText="resources.variants.helpers.storage_location"
          fullWidth
        />
        <BooleanInput source="isActive" defaultValue />
      </SimpleForm>
    </Create>
  );
};
