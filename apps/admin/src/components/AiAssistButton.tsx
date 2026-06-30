import { useState } from 'react';
import { Button, useNotify, useTranslate } from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TranslateIcon from '@mui/icons-material/Translate';
import { fetchJson } from '../http';
import { API_BASE } from '../config';

type Locale = 'fr' | 'en';
type Kind = 'name' | 'description' | 'text';

type TranslateProps = {
  mode: 'translate';
  /** react-hook-form source to read the text from (e.g. "name.fr"). */
  sourceField: string;
  /** react-hook-form source to write the translation into (e.g. "name.en"). */
  targetField: string;
  /** Locale of the source text. */
  sourceLocale: Locale;
  /** Locale to translate into (and the locale of the target field). */
  targetLocale: Locale;
  /** Field-kind hint passed to the API to tune the prompt. */
  kind?: Kind;
  /** Override the auto-derived label translation key. */
  label?: string;
};

type GenerateProps = {
  mode: 'generate';
  /** Field holding the product name (e.g. "name.fr"). */
  nameField: string;
  /** Field to write the generated description into (e.g. "description.fr"). */
  targetField: string;
  /** Locale to generate the description in. */
  locale: Locale;
  /** Optional field whose value is forwarded as free-text hints. */
  hintsField?: string;
  /** Override the label translation key. */
  label?: string;
};

type AiAssistButtonProps = TranslateProps | GenerateProps;

const readField = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/**
 * Small react-admin-friendly button that calls the back-office AI endpoints
 * and writes the result into a sibling form field. Two modes:
 *  - `translate`: reads `sourceField`, POSTs /ai/translate, fills `targetField`.
 *  - `generate`:  reads `nameField`, POSTs /ai/generate-description, fills
 *    `targetField`.
 * Auth + locale headers are handled by `fetchJson`. Errors surface via notify.
 */
export const AiAssistButton = (props: AiAssistButtonProps) => {
  const translate = useTranslate();
  const notify = useNotify();
  const { setValue } = useFormContext();
  const [loading, setLoading] = useState(false);

  // Watch the field(s) this button reads, so it disables when there's nothing
  // to work from.
  const sourceValue = useWatch({
    name: props.mode === 'translate' ? props.sourceField : props.nameField,
  });
  const hintsValue = useWatch({
    name: props.mode === 'generate' ? (props.hintsField ?? '') : '',
  });

  const source = readField(sourceValue);
  const disabled = loading || source.trim().length === 0;

  const defaultLabel =
    props.mode === 'translate'
      ? props.targetLocale === 'en'
        ? 'ui.ai.translate_to_en'
        : 'ui.ai.translate_to_fr'
      : 'ui.ai.generate';
  const labelKey = loading
    ? props.mode === 'generate'
      ? 'ui.ai.generating'
      : 'ui.ai.translating'
    : (props.label ?? defaultLabel);

  const run = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      if (props.mode === 'translate') {
        const { body } = await fetchJson<{ text: string }>(`${API_BASE}/ai/translate`, {
          method: 'POST',
          body: JSON.stringify({
            text: source,
            sourceLocale: props.sourceLocale,
            targetLocale: props.targetLocale,
            kind: props.kind ?? 'text',
          }),
        });
        setValue(props.targetField, body.text, { shouldDirty: true, shouldValidate: true });
        notify('ui.ai.translated', { type: 'success' });
      } else {
        const hints = readField(hintsValue).trim();
        const { body } = await fetchJson<{ text: string }>(
          `${API_BASE}/ai/generate-description`,
          {
            method: 'POST',
            body: JSON.stringify({
              productName: source,
              locale: props.locale,
              ...(hints ? { hints } : {}),
            }),
          },
        );
        setValue(props.targetField, body.text, { shouldDirty: true, shouldValidate: true });
        notify('ui.ai.generated', { type: 'success' });
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ui.ai.error'), {
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      label={labelKey}
      onClick={run}
      disabled={disabled}
      startIcon={props.mode === 'generate' ? <AutoFixHighIcon /> : <TranslateIcon />}
    />
  );
};
