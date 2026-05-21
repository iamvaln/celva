import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  IconButton,
  Stack,
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
  urls: Variants;
};

export const ProductImagesPanel = ({ productId }: { productId: string }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
