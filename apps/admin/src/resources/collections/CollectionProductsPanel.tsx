import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  List as MuiList,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNotify, useTranslate } from 'react-admin';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import type { Product } from '../../types';

type Row = { productId: string; sortOrder: number };

const formatProduct = (p: Product | null) => {
  if (!p) return '';
  const fr = p.name?.fr ?? '';
  const en = p.name?.en ?? '';
  return `${fr}${fr && en ? ' / ' : ''}${en} — ${p.slug}`;
};

export const CollectionProductsPanel = ({ collectionId }: { collectionId: string }) => {
  const t = useTranslate();
  const notify = useNotify();
  const [items, setItems] = useState<Row[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [picker, setPicker] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadItems = useCallback(async () => {
    const { body } = await fetchJson<Row[]>(
      `${API_BASE}/collections/${collectionId}/products`,
    );
    setItems(body);
  }, [collectionId]);

  const loadProducts = useCallback(async () => {
    const { body } = await fetchJson<{ data: Product[] }>(
      `${API_BASE}/products?pageSize=200&sortBy=slug&sortDir=asc`,
    );
    setProducts(body.data);
  }, []);

  useEffect(() => {
    void loadItems();
    void loadProducts();
  }, [loadItems, loadProducts]);

  const persist = async (next: Row[]) => {
    setLoading(true);
    try {
      const { body } = await fetchJson<Row[]>(
        `${API_BASE}/collections/${collectionId}/products`,
        {
          method: 'PUT',
          body: JSON.stringify({
            items: next.map((r, idx) => ({ productId: r.productId, sortOrder: idx })),
          }),
        },
      );
      setItems(body);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'save failed', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!picker || items.some((r) => r.productId === picker.id)) return;
    void persist([...items, { productId: picker.id, sortOrder: items.length }]);
    setPicker(null);
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    void persist(next);
  };

  const handleRemove = (productId: string) => {
    void persist(items.filter((r) => r.productId !== productId));
  };

  const available = products.filter((p) => !items.some((r) => r.productId === p.id));

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('resources.collections.products.title')}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Autocomplete
          sx={{ flex: 1 }}
          options={available}
          value={picker}
          onChange={(_, v) => setPicker(v)}
          getOptionLabel={(p) => formatProduct(p)}
          renderInput={(params) => (
            <TextField {...params} label={t('resources.collections.products.add_label')} />
          )}
        />
        <Button onClick={handleAdd} disabled={!picker || loading} variant="contained">
          {t('resources.collections.products.add')}
        </Button>
      </Stack>
      <MuiList>
        {items.map((row, idx) => {
          const p = productsById.get(row.productId);
          return (
            <ListItem
              key={row.productId}
              divider
              secondaryAction={
                <Stack direction="row">
                  <IconButton
                    disabled={idx === 0 || loading}
                    onClick={() => handleMove(idx, -1)}
                  >
                    <ArrowUpwardIcon />
                  </IconButton>
                  <IconButton
                    disabled={idx === items.length - 1 || loading}
                    onClick={() => handleMove(idx, 1)}
                  >
                    <ArrowDownwardIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    disabled={loading}
                    onClick={() => handleRemove(row.productId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={p ? formatProduct(p) : row.productId}
                secondary={`#${idx + 1}`}
              />
            </ListItem>
          );
        })}
        {items.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {t('resources.collections.products.empty')}
          </Typography>
        )}
      </MuiList>
    </Box>
  );
};
