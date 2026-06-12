import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { useInput, useNotify, useTranslate, type InputProps } from 'react-admin';
import { API_BASE, STORAGE_KEYS } from '../config';
import './ImageDropInput.css';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export type ImageDropInputProps = InputProps & {
  /** CSS aspect-ratio for the drop zone, e.g. 16 / 9 or 21 / 9. Defaults to 16/9. */
  aspectRatio?: number;
  /** Optional helper text translation key shown under the field. */
  helperText?: string;
};

type Status = 'idle' | 'uploading' | 'error';

/**
 * React-Admin single-image upload input. Renders a dashed drop-zone that
 * accepts drag-and-drop or click-to-browse, uploads the file to the API's
 * generic `POST /uploads/image` endpoint (Bearer auth from localStorage,
 * matching OrderShow's raw-fetch pattern), and stores the returned public
 * URL into the bound field via `field.onChange(url)`.
 */
export const ImageDropInput = (props: ImageDropInputProps) => {
  const { aspectRatio = 16 / 9, helperText, ...rest } = props;
  const translate = useTranslate();
  const notify = useNotify();
  const {
    field,
    fieldState: { error, invalid },
    id,
    isRequired,
  } = useInput(rest);

  const inputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [dragging, setDragging] = useState(false);

  const value: string = typeof field.value === 'string' ? field.value : '';

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setStatus('error');
        notify('ui.imgdrop.errors.unsupported', { type: 'warning' });
        return;
      }
      if (file.size > MAX_BYTES) {
        setStatus('error');
        notify('ui.imgdrop.errors.too_large', { type: 'warning' });
        return;
      }

      setStatus('uploading');
      try {
        const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
        const body = new FormData();
        body.append('file', file);
        const res = await fetch(`${API_BASE}/uploads/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
          body,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = (await res.json()) as { data?: { url?: string }; url?: string };
        const url = payload?.data?.url ?? payload?.url;
        if (!url) {
          throw new Error('missing url');
        }
        field.onChange(url);
        setStatus('idle');
        notify('ui.imgdrop.uploaded', { type: 'success' });
      } catch {
        setStatus('error');
        notify('ui.imgdrop.errors.failed', { type: 'error' });
      }
    },
    [field, notify],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void upload(file);
    },
    [upload],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (status === 'uploading') return;
      onFiles(e.dataTransfer.files);
    },
    [onFiles, status],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const browse = useCallback(() => {
    if (status !== 'uploading') fileRef.current?.click();
  }, [status]);

  const clear = useCallback(() => {
    field.onChange('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  }, [field]);

  const busy = status === 'uploading';
  const showError = invalid || status === 'error';

  return (
    <div className="celva-imgdrop" data-error={showError ? 'true' : undefined}>
      <span className="celva-imgdrop__label" id={`${inputId}-label`}>
        {translate('ui.imgdrop.label')}
        {isRequired ? ' *' : ''}
      </span>

      <div
        role="button"
        tabIndex={0}
        aria-labelledby={`${inputId}-label`}
        aria-describedby={`${inputId}-help`}
        aria-busy={busy}
        className="celva-imgdrop__zone"
        data-dragging={dragging ? 'true' : undefined}
        data-has-image={value ? 'true' : undefined}
        style={{ aspectRatio: String(aspectRatio) }}
        onClick={value ? undefined : browse}
        onKeyDown={(e) => {
          if (!value && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            browse();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {value ? (
          <img className="celva-imgdrop__preview" src={value} alt={translate('ui.imgdrop.alt')} />
        ) : (
          <div className="celva-imgdrop__placeholder">
            <span className="celva-imgdrop__icon" aria-hidden="true">
              {busy ? '…' : '↑'}
            </span>
            <span className="celva-imgdrop__hint">
              {busy ? translate('ui.imgdrop.uploading') : translate('ui.imgdrop.drop_or_browse')}
            </span>
            <span className="celva-imgdrop__sub">{translate('ui.imgdrop.formats')}</span>
          </div>
        )}

        {busy ? <div className="celva-imgdrop__overlay">{translate('ui.imgdrop.uploading')}</div> : null}
      </div>

      {value ? (
        <div className="celva-imgdrop__actions">
          <button type="button" className="celva-imgdrop__btn" onClick={browse} disabled={busy}>
            {translate('ui.imgdrop.replace')}
          </button>
          <button
            type="button"
            className="celva-imgdrop__btn celva-imgdrop__btn--danger"
            onClick={clear}
            disabled={busy}
          >
            {translate('ui.imgdrop.remove')}
          </button>
        </div>
      ) : null}

      <input
        ref={fileRef}
        id={id}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        className="celva-imgdrop__file"
        onChange={(e) => onFiles(e.target.files)}
        tabIndex={-1}
      />

      <span className="celva-imgdrop__helper" id={`${inputId}-help`}>
        {showError && error?.message
          ? translate(error.message, { _: error.message })
          : helperText
            ? translate(helperText, { _: helperText })
            : translate('ui.imgdrop.formats')}
      </span>
    </div>
  );
};

export default ImageDropInput;
