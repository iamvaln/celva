import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UploadIcon from '@mui/icons-material/Upload';
import { useNotify, useTranslate } from 'react-admin';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

type Variants = { original: string; large: string; medium: string; thumb: string };
type ImageRow = {
  id: string;
  key: string;
  position: number;
  isPrimary: boolean;
  altText?: { fr?: string; en?: string } | null;
  attributeValueId?: string | null;
  urls: Variants;
};

type Bilingual = { fr?: string; en?: string };
type Attribute = { id: string; name: Bilingual };
type AttributeValue = { id: string; value: Bilingual };
type ColorOption = { id: string; label: string };

const COLOR_KEYWORDS = ['coloris', 'couleur', 'colour', 'color'];
const isColorAttribute = (name: Bilingual): boolean => {
  const hay = `${name.fr ?? ''} ${name.en ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return COLOR_KEYWORDS.some((k) => hay.includes(k));
};

export const ProductImagesPanel = ({ productId }: { productId: string }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);

  // Load the product's colour attribute values so each image can be tagged.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { body: attrs } = await fetchJson<{ data: Attribute[] }>(
          `${API_BASE}/attributes?productId=${productId}&pageSize=100`,
        );
        const colorAttr = attrs.data.find((a) => isColorAttribute(a.name));
        if (!colorAttr) {
          if (!cancelled) setColorOptions([]);
          return;
        }
        const { body: values } = await fetchJson<{ data: AttributeValue[] }>(
          `${API_BASE}/attribute-values?attributeId=${colorAttr.id}&pageSize=100`,
        );
        if (!cancelled) {
          setColorOptions(
            values.data.map((v) => ({ id: v.id, label: v.value.fr ?? v.value.en ?? '' })),
          );
        }
      } catch {
        if (!cancelled) setColorOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const load = useCallback(async () => {
    try {
      const { body } = await fetchJson<ImageRow[]>(
        `${API_BASE}/products/${productId}/images`,
      );
      setImages(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await fetchJson(`${API_BASE}/products/${productId}/images`, {
        method: 'POST',
        body: form,
      });
      notify('resources.products.images.uploaded', { type: 'success' });
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'upload failed', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    const ids = next.map((i) => i.id);
    try {
      const { body } = await fetchJson<ImageRow[]>(
        `${API_BASE}/products/${productId}/images/order`,
        { method: 'PATCH', body: JSON.stringify({ ids }) },
      );
      setImages(body);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'reorder failed', { type: 'error' });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      const { body } = await fetchJson<ImageRow[]>(
        `${API_BASE}/products/${productId}/images/${imageId}/primary`,
        { method: 'PATCH' },
      );
      setImages(body);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'set primary failed', { type: 'error' });
    }
  };

  const handleSetColor = async (imageId: string, attributeValueId: string | null) => {
    try {
      const { body } = await fetchJson<ImageRow>(
        `${API_BASE}/products/${productId}/images/${imageId}/color`,
        { method: 'PATCH', body: JSON.stringify({ attributeValueId }) },
      );
      setImages((prev) => prev.map((i) => (i.id === imageId ? body : i)));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'set color failed', { type: 'error' });
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm(translate('resources.products.images.confirm_delete'))) return;
    try {
      await fetchJson(`${API_BASE}/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'delete failed', { type: 'error' });
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h6">{translate('resources.products.images.title')}</Typography>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadIcon />}
          disabled={uploading}
        >
          {uploading
            ? translate('resources.products.images.uploading')
            : translate('resources.products.images.upload')}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {images.length === 0 && !error && (
        <Typography color="text.secondary">
          {translate('resources.products.images.empty')}
        </Typography>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 2 }}>
        {images.map((img, idx) => (
          <Card key={img.id} variant="outlined">
            <CardMedia
              component="img"
              image={img.urls.thumb}
              alt={img.altText?.fr ?? img.altText?.en ?? ''}
              sx={{ height: 160, objectFit: 'cover' }}
            />
            {colorOptions.length > 0 && (
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label={translate('resources.products.images.color')}
                  value={img.attributeValueId ?? ''}
                  onChange={(e) => handleSetColor(img.id, e.target.value || null)}
                >
                  <MenuItem value="">
                    <em>{translate('resources.products.images.color_none')}</em>
                  </MenuItem>
                  {colorOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            )}
            <CardActions sx={{ justifyContent: 'space-between' }}>
              <Box>
                <IconButton
                  onClick={() => handleSetPrimary(img.id)}
                  title={translate('resources.products.images.make_primary')}
                  color={img.isPrimary ? 'warning' : 'default'}
                >
                  {img.isPrimary ? <StarIcon /> : <StarOutlineIcon />}
                </IconButton>
              </Box>
              <Box>
                <IconButton
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  title="Up"
                >
                  <ArrowUpwardIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === images.length - 1}
                  title="Down"
                >
                  <ArrowDownwardIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(img.id)} color="error" title="Delete">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
