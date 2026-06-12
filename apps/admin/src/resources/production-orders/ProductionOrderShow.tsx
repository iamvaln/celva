import './production-orders.css';
import { useState } from 'react';
import {
  Show,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
} from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DoneIcon from '@mui/icons-material/Done';
import CheckIcon from '@mui/icons-material/Check';
import FactoryIcon from '@mui/icons-material/Factory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { ProductionOrder } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { fmtFCFA } from '../orders/orderSkin';

type ProdStatus = ProductionOrder['status'];
type Stage = ProductionOrder['stages'][number];

/** Status → translation key + design status-class (colour binding in celva-skin.css). */
const PROD_STATUS_SKIN: Record<ProdStatus, { key: string; sc: string }> = {
  PLANNED: { key: 'status_planned', sc: 's-todo' },
  IN_PROGRESS: { key: 'status_in_progress', sc: 's-prod' },
  COMPLETED: { key: 'status_completed', sc: 's-done' },
  CANCELLED: { key: 'status_cancelled', sc: 's-neutral' },
};

const productName = (r: ProductionOrder): string =>
  r.product?.name?.fr ?? r.product?.slug ?? '—';

/** Per-piece cost of goods: (materials + labour/subcontract) ÷ quantity. */
const materialsTotal = (r: ProductionOrder): number =>
  r.materialConsumptions.reduce(
    (sum, c) => sum + Number(c.quantityUsed) * Number(c.rawMaterial.unitPrice),
    0,
  );

const runCost = (r: ProductionOrder): number =>
  r.type === 'SUBCONTRACTED' ? Number(r.subcontractCost) : Number(r.laborCost);

const dateFr = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// ── Functional actions (preserved behaviour, brand-styled) ──────────────

/** Shared POST helper mirroring the original useAction hook (start/complete/cancel). */
const useAction = () => {
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const run = async (url: string, successKey: string) => {
    try {
      setBusy(true);
      await fetchJson(url, { method: 'POST' });
      notify(successKey, { type: 'success' });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
};

/** Primary contextual action: Démarrer (PLANNED) / Réceptionner|Terminer (IN_PROGRESS). */
const PrimaryAction = ({
  record,
  busy,
  run,
}: {
  record: ProductionOrder;
  busy: boolean;
  run: (url: string, key: string) => void;
}) => {
  const t = useTranslate();
  const allStagesDone =
    record.type !== 'INTERNAL' ||
    record.stages.length === 0 ||
    record.stages.every((s) => s.status === 'COMPLETED');

  if (record.status === 'PLANNED') {
    return (
      <button
        className="btn btn-primary btn-lg"
        disabled={busy}
        onClick={() =>
          run(
            `${API_BASE}/production-orders/${record.id}/start`,
            'resources.production-orders.notifications.started',
          )
        }
      >
        <PlayArrowIcon sx={{ fontSize: 18 }} /> {t('ui.prod_show.action_start')}
      </button>
    );
  }
  if (record.status === 'IN_PROGRESS') {
    const label =
      record.type === 'SUBCONTRACTED'
        ? t('ui.prod_show.action_receive')
        : t('ui.prod_show.action_complete');
    return (
      <button
        className="btn btn-primary btn-lg"
        disabled={busy || !allStagesDone}
        title={allStagesDone ? '' : t('ui.prod_show.complete_guard')}
        onClick={() =>
          run(
            `${API_BASE}/production-orders/${record.id}/complete`,
            'resources.production-orders.notifications.completed',
          )
        }
      >
        <DoneIcon sx={{ fontSize: 18 }} /> {label}
      </button>
    );
  }
  return null;
};

const CancelAction = ({
  record,
  busy,
  run,
}: {
  record: ProductionOrder;
  busy: boolean;
  run: (url: string, key: string) => void;
}) => {
  const t = useTranslate();
  if (record.status !== 'PLANNED' && record.status !== 'IN_PROGRESS') return null;
  return (
    <button
      className="btn btn-quiet btn-danger"
      disabled={busy}
      onClick={() => {
        if (!window.confirm(t('resources.production-orders.dialogs.cancel_confirm'))) return;
        run(
          `${API_BASE}/production-orders/${record.id}/cancel`,
          'resources.production-orders.notifications.cancelled',
        );
      }}
    >
      {t('ui.prod_show.action_cancel')}
    </button>
  );
};

// ── Cards ───────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: ProdStatus }) => {
  const t = useTranslate();
  const s = PROD_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.production-orders.' + s.key)}
    </span>
  );
};

/** Internal stage timeline — current stage highlighted via .tl-item.cur. */
const StageTimeline = ({ stages }: { stages: Stage[] }) => {
  const t = useTranslate();
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstOpen = ordered.find((s) => s.status !== 'COMPLETED');
  return (
    <div className="info-card">
      <h4>{t('ui.prod_show.card_stages')}</h4>
      <div className="timeline">
        {ordered.map((s) => {
          const done = s.status === 'COMPLETED';
          const cur = !done && firstOpen?.id === s.id;
          const stateKey = done
            ? 'ui.prod_show.stage_done'
            : cur
              ? 'ui.prod_show.stage_current'
              : 'ui.prod_show.stage_upcoming';
          return (
            <div
              key={s.id}
              className={`tl-item${cur ? ' cur' : ''}${done ? ' done' : ''}`}
            >
              <div className="tlt">
                {done && <CheckIcon sx={{ fontSize: 15, mr: 0.5, verticalAlign: '-2px' }} />}
                {s.name}
              </div>
              <div className="tls">
                {t(stateKey)}
                {done && s.completedAt ? ` · ${dateFr(s.completedAt)}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SubcontractorCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  return (
    <div className="info-card">
      <h4>{t('ui.prod_show.card_subcontractor')}</h4>
      <div className="row" style={{ gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 17, fontFamily: 'var(--font-display)', fontWeight: 500 }}>
            {record.subcontractorName ?? '—'}
          </div>
          <div className="note" style={{ marginTop: 2 }}>
            {t('ui.prod_show.subcontract_note', { n: record.quantity })}
          </div>
        </div>
        <span className="pill s-neutral">{t('ui.prod_show.external')}</span>
      </div>
    </div>
  );
};

const MaterialsCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  const internal = record.type === 'INTERNAL';
  return (
    <div className="info-card">
      <h4>{internal ? t('ui.prod_show.card_materials') : t('ui.prod_show.card_materials_sent')}</h4>
      {record.materialConsumptions.length === 0 ? (
        <div className="note">{t('ui.prod_show.no_materials')}</div>
      ) : (
        <>
          {record.materialConsumptions.map((c) => {
            const lineTotal = Number(c.quantityUsed) * Number(c.rawMaterial.unitPrice);
            return (
              <div className="item-line" key={c.id}>
                <div className="ithumb" style={{ width: 40, height: 40 }}>
                  <HandymanIcon sx={{ fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="iname">{c.rawMaterial.name}</div>
                  <div className="iqty">
                    {Number(c.quantityUsed)} {c.rawMaterial.unit} × {fmtFCFA(c.rawMaterial.unitPrice)}
                  </div>
                </div>
                <div className="iprice num">{fmtFCFA(lineTotal)}</div>
              </div>
            );
          })}
          <div className="divider" style={{ margin: '8px 0' }} />
          <div className="fin-line">
            <span className="muted">{t('ui.prod_show.materials_total')}</span>
            <span className="num">{fmtFCFA(materialsTotal(record))}</span>
          </div>
        </>
      )}
    </div>
  );
};

const RunCostCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  const internal = record.type === 'INTERNAL';
  return (
    <div className="info-card">
      <h4>{internal ? t('ui.prod_show.card_labor') : t('ui.prod_show.card_subcontract_cost')}</h4>
      <div className="kv-line">
        <span className="k">
          {internal ? t('ui.prod_show.labor_flat') : t('ui.prod_show.subcontract_flat')}
        </span>
        <span className="v big num">{fmtFCFA(runCost(record))}</span>
      </div>
      <div className="note" style={{ marginTop: 4 }}>
        {internal ? t('ui.prod_show.labor_note') : t('ui.prod_show.subcontract_cost_note')}
      </div>
    </div>
  );
};

/** COGS card — materials + run cost → unit cost, styled like the margin card. */
const CogsCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  const mats = materialsTotal(record);
  const run = runCost(record);
  const total = mats + run;
  const unit = record.quantity > 0 ? total / record.quantity : 0;
  const internal = record.type === 'INTERNAL';
  return (
    <div className="margin-card">
      <div className="ml">{t('ui.prod_show.cogs_label')}</div>
      <div className="mv num">
        {fmtFCFA(unit)}
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 6 }}>
          {t('ui.prod_show.per_piece')}
        </span>
      </div>
      <div className="divider" style={{ margin: '14px 0 10px' }} />
      <div className="fin-line" style={{ padding: '5px 0' }}>
        <span className="muted">{t('ui.prod_show.cogs_materials')}</span>
        <span className="num">{fmtFCFA(mats)}</span>
      </div>
      <div className="fin-line" style={{ padding: '5px 0' }}>
        <span className="muted">
          {internal ? t('ui.prod_show.cogs_labor') : t('ui.prod_show.cogs_subcontract')}
        </span>
        <span className="num">{fmtFCFA(run)}</span>
      </div>
      <div className="fin-line total" style={{ fontSize: 16 }}>
        <span>{t('ui.prod_show.cogs_total', { n: record.quantity })}</span>
        <span className="v num">{fmtFCFA(total)}</span>
      </div>
      <div className="note" style={{ marginTop: 10, fontStyle: 'italic' }}>
        {internal ? t('ui.prod_show.cogs_note_internal') : t('ui.prod_show.cogs_note_subcontract')}
      </div>
    </div>
  );
};

const StatusCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  return (
    <div className="info-card">
      <h4>{t('ui.prod_show.card_status')}</h4>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_status')}</span>
        <span className="v">
          <StatusPill status={record.status} />
        </span>
      </div>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_type')}</span>
        <span className="v">
          {record.type === 'INTERNAL'
            ? t('ui.production-orders.type_internal')
            : t('ui.production-orders.type_subcontracted')}
        </span>
      </div>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_quantity')}</span>
        <span className="v num">{record.quantity}</span>
      </div>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_started')}</span>
        <span className="v">{record.startDate ? dateFr(record.startDate) : '—'}</span>
      </div>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_ended')}</span>
        <span className="v">{record.endDate ? dateFr(record.endDate) : '—'}</span>
      </div>
      <div className="kv-line">
        <span className="k">{t('ui.prod_show.kv_created')}</span>
        <span className="v">{dateFr(record.createdAt)}</span>
      </div>
    </div>
  );
};

const AnticipateCard = ({ record }: { record: ProductionOrder }) => {
  const t = useTranslate();
  const internal = record.type === 'INTERNAL';
  return (
    <div className="anticipate">
      {internal ? <FactoryIcon className="ic" /> : <LocalShippingIcon className="ic" />}
      <div>
        <div className="at">
          {internal ? t('ui.prod_show.anticipate_internal_title') : t('ui.prod_show.anticipate_subcontract_title')}
        </div>
        <div className="ab">
          {internal
            ? t('ui.prod_show.anticipate_internal_body', { n: record.quantity })
            : t('ui.prod_show.anticipate_subcontract_body', {
                n: record.quantity,
                amount: fmtFCFA(runCost(record)),
              })}
        </div>
      </div>
    </div>
  );
};

// ── Detail layout ───────────────────────────────────────────────────────

const ProductionOrderDetailSkin = () => {
  const record = useRecordContext<ProductionOrder>();
  const redirect = useRedirect();
  const t = useTranslate();
  const { busy, run } = useAction();
  if (!record) return null;

  const internal = record.type === 'INTERNAL';
  const showAnticipate = record.status === 'PLANNED' || record.status === 'IN_PROGRESS';
  const guardActive =
    internal &&
    record.status === 'IN_PROGRESS' &&
    record.stages.length > 0 &&
    !record.stages.every((s) => s.status === 'COMPLETED');

  return (
    <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
      <button
        className="back-link"
        style={{ marginBottom: 16 }}
        onClick={() => redirect('list', 'production-orders')}
      >
        <ArrowBackIcon sx={{ fontSize: 16 }} /> {t('ui.prod_show.back')}
      </button>

      {/* Header */}
      <div className="detail-head">
        <div>
          <div className="row" style={{ gap: 14 }}>
            <span className="dh-num">{productName(record)}</span>
            <StatusPill status={record.status} />
          </div>
          <div className="dh-meta">
            <span>
              {internal
                ? t('ui.production-orders.type_internal')
                : t('ui.production-orders.type_subcontracted')}
            </span>
            <span>·</span>
            <span>
              {record.quantity}{' '}
              {record.quantity > 1
                ? t('ui.production-orders.pieces')
                : t('ui.production-orders.piece')}
            </span>
            {!internal && record.subcontractorName && (
              <>
                <span>·</span>
                <span>{record.subcontractorName}</span>
              </>
            )}
          </div>
        </div>
        <div className="dh-actions">
          <PrimaryAction record={record} busy={busy} run={run} />
        </div>
      </div>

      {/* Secondary actions */}
      <div className="secondary-actions">
        <CancelAction record={record} busy={busy} run={run} />
      </div>

      {guardActive && (
        <div className="callout" style={{ marginBottom: 20 }}>
          {t('ui.prod_show.complete_guard')}
        </div>
      )}

      <div className="detail-grid">
        {/* Left column */}
        <div className="grid">
          {internal ? (
            record.stages.length > 0 && <StageTimeline stages={record.stages} />
          ) : (
            <SubcontractorCard record={record} />
          )}
          <MaterialsCard record={record} />
          <RunCostCard record={record} />
          {record.notes && (
            <div className="info-card">
              <h4>{t('ui.prod_show.card_notes')}</h4>
              <div style={{ fontSize: 15 }}>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="grid">
          <CogsCard record={record} />
          <StatusCard record={record} />
          {showAnticipate && <AnticipateCard record={record} />}
        </div>
      </div>
    </div>
  );
};

export const ProductionOrderShow = () => (
  <Show actions={false} component="div">
    <CelvaSkin>
      <ProductionOrderDetailSkin />
    </CelvaSkin>
  </Show>
);
