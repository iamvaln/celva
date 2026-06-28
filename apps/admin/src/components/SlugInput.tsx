import { useEffect, useRef } from 'react';
import { TextInput, type TextInputProps } from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';

/**
 * Normalise arbitrary text into a URL slug: lowercase, strip accents, collapse
 * any run of non-alphanumerics into a single hyphen, trim leading/trailing
 * hyphens. Shared by every slug field so behaviour is identical everywhere.
 */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type SlugInputProps = TextInputProps & {
  /** Field whose value seeds the slug until the user edits it (e.g. "name.fr"). */
  from?: string;
};

/**
 * Slug field that (a) auto-follows another field (the name) until the user
 * edits the slug by hand, and (b) slugifies whatever is typed. In edit mode an
 * existing slug counts as "already touched", so renaming a live record never
 * silently rewrites its slug (which would break its public URL).
 */
export const SlugInput = ({ source = 'slug', from = 'name.fr', ...props }: SlugInputProps) => {
  const { setValue, getValues } = useFormContext();
  const nameValue = useWatch({ name: from }) as string | undefined;
  const slugValue = useWatch({ name: source }) as string | undefined;
  // Seed "touched" from the initial slug: empty on create → follow the name;
  // pre-filled on edit → leave it alone unless the user clears/edits it.
  const touchedRef = useRef<boolean>(Boolean(getValues(source)));

  useEffect(() => {
    if (touchedRef.current) return;
    const next = slugify(nameValue ?? '');
    if (next !== (slugValue ?? '')) {
      setValue(source, next, { shouldDirty: true, shouldValidate: false });
    }
    // Only react to name changes; slugValue is read for comparison, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameValue]);

  return (
    <TextInput
      source={source}
      {...props}
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        // Once the user types here, stop auto-following — but if they clear it,
        // resume following the name.
        touchedRef.current = raw.length > 0;
        setValue(source, slugify(raw), { shouldDirty: true, shouldValidate: true });
      }}
    />
  );
};
