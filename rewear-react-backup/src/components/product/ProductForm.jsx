import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { AlertIcon, ChevronIcon, CloseIcon, UploadIcon } from '@/components/ui/icons';
import ProductBadge from '@/components/product/ProductBadge';
import { CONDITIONS, ERAS, PRODUCT_STATUS, SIZES, STYLES } from '@/constants';
import { cx } from '@/lib/cx';

const MAX_PHOTOS = 6;
const MAX_PHOTO_MB = 5;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MEASUREMENT_FIELDS = ['Chest', 'Shoulder', 'Sleeve', 'Waist', 'Hip', 'Length', 'Inseam', 'Rise'];

const EMPTY = {
  title: '', description: '', categoryId: '', brand: '', size: '',
  condition: '', era: '', styles: [], material: '', measurements: {},
  featured: false, price: '', images: [],
};

const toPhoto = (i) => (typeof i === 'string' ? { id: i, url: i } : i);

function fromInitial(initial = {}) {
  initial = initial ?? {};
  return {
    ...EMPTY,
    ...initial,
    price: initial.price != null ? String(initial.price) : '',
    styles: Array.isArray(initial.styles) ? [...initial.styles] : (initial.style ? [initial.style] : []),
    measurements: { ...(initial.measurements ?? {}) },
    images: (initial.images ?? []).map(toPhoto),
  };
}

// A draft only needs a title. Submitting for curation needs everything a curator reviews.
function validate(v, intent) {
  const e = {};
  if (v.title.trim().length < 3) e.title = 'Give the piece a title of at least 3 characters.';
  if (intent === 'draft') return e;

  if (v.description.trim().length < 20) e.description = 'Describe the piece in at least 20 characters: fabric, fit, any flaws.';
  if (!v.categoryId) e.categoryId = 'Choose a category.';
  if (!v.size) e.size = 'Choose a size.';
  if (!v.condition) e.condition = 'Choose a condition.';
  const price = Number(v.price);
  if (!v.price || !Number.isFinite(price) || price <= 0) e.price = 'Enter a price greater than zero.';
  if (v.images.length === 0) e.images = 'Add at least one photo so the curator can review the piece.';
  return e;
}

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t border-beige pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <div>
        <h2 className="title">{title}</h2>
        {description && <p className="mt-1.5 text-meta">{description}</p>}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

/**
 * Presentational form for creating or editing a product (Seller, Step 9).
 *
 * <ProductForm
 *   initialValues={product}              // optional, for editing
 *   status={product?.status}
 *   rejectionReason={product?.rejectionReason}
 *   categories={[{ id, name }]}
 *   submitting={saving}
 *   onSubmit={(values, intent) => …}     // intent: 'draft' | 'submit'
 *   onCancel={() => navigate(-1)}
 * />
 *
 * values = { title, description, categoryId, brand, size, condition, era, style,
 *            price: number, images: [{ id, url, file? }] }
 * `file` is set only on newly added photos; the service layer uploads those (Step 9 / 12).
 */
export default function ProductForm({
  initialValues,
  status,
  rejectionReason,
  categories = [],
  submitting = false,
  disabled = false,
  onSubmit,
  onCancel,
  className,
}) {
  const uid = useId();
  const fid = (name) => `${uid}-${name}`;
  const [values, setValues] = useState(() => fromInitial(initialValues));
  const [errors, setErrors] = useState({});
  const [photoNotes, setPhotoNotes] = useState([]);
  const fileInput = useRef(null);
  const replaceInput = useRef(null);
  const replaceId = useRef(null);
  const blobUrls = useRef(new Set());

  // Free the preview URLs created for newly picked files.
  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const set = (name) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const checkFile = (file) => {
    if (!PHOTO_TYPES.includes(file.type)) return `${file.name} must be JPG, PNG or WebP.`;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `${file.name} is larger than ${MAX_PHOTO_MB} MB.`;
    return '';
  };

  const makePhoto = (file) => {
    const url = URL.createObjectURL(file);
    blobUrls.current.add(url);
    return { id: `new-${crypto.randomUUID()}`, url, file };
  };

  const addFiles = (fileList) => {
    const notes = [];
    const accepted = [];
    for (const f of Array.from(fileList)) {
      const problem = checkFile(f);
      if (problem) notes.push(problem);
      else accepted.push(f);
    }
    const room = MAX_PHOTOS - values.images.length;
    if (accepted.length > room) notes.push(`You can add up to ${MAX_PHOTOS} photos. Extra files were skipped.`);

    const added = accepted.slice(0, Math.max(room, 0)).map(makePhoto);
    setPhotoNotes(notes);
    if (added.length) {
      setValues((v) => ({ ...v, images: [...v.images, ...added] }));
      setErrors((er) => ({ ...er, images: undefined }));
    }
  };

  const removePhoto = (id) => {
    setValues((v) => {
      const gone = v.images.find((p) => p.id === id);
      if (gone && blobUrls.current.delete(gone.url)) URL.revokeObjectURL(gone.url);
      return { ...v, images: v.images.filter((p) => p.id !== id) };
    });
  };

  const startReplace = (id) => {
    replaceId.current = id;
    replaceInput.current?.click();
  };

  const replacePhoto = (fileList) => {
    const [file] = Array.from(fileList ?? []);
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setPhotoNotes([problem]);
      return;
    }
    const nextPhoto = makePhoto(file);
    const targetId = replaceId.current;
    setValues((v) => {
      const current = v.images.find((p) => p.id === targetId);
      if (current && blobUrls.current.delete(current.url)) URL.revokeObjectURL(current.url);
      return { ...v, images: v.images.map((p) => (p.id === targetId ? nextPhoto : p)) };
    });
    setErrors((er) => ({ ...er, images: undefined }));
    setPhotoNotes([]);
    replaceId.current = null;
  };

  const makeCover = (id) =>
    setValues((v) => {
      const pick = v.images.find((p) => p.id === id);
      return { ...v, images: [pick, ...v.images.filter((p) => p.id !== id)] };
    });

  const movePhoto = (id, direction) =>
    setValues((v) => {
      const index = v.images.findIndex((p) => p.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= v.images.length) return v;
      const images = [...v.images];
      [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
      return { ...v, images };
    });

  const toggleStyle = (style) => {
    setValues((v) => ({
      ...v,
      styles: v.styles.includes(style) ? v.styles.filter((s) => s !== style) : [...v.styles, style],
    }));
  };

  const setMeasurement = (name) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, measurements: { ...v.measurements, [name]: value } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // The first submit button in the DOM is "Save draft", so Enter in a field saves a draft, never submits.
    const intent = e.nativeEvent.submitter?.value === 'submit' ? 'submit' : 'draft';
    const found = validate(values, intent);
    setErrors(found);

    const first = ['title', 'description', 'categoryId', 'size', 'condition', 'price', 'images'].find((k) => found[k]);
    if (first) {
      document.getElementById(fid(first))?.focus();
      return;
    }
    const measurements = Object.fromEntries(
      Object.entries(values.measurements ?? {})
        .map(([key, value]) => [key, String(value ?? '').trim()])
        .filter(([, value]) => value !== '')
        .map(([key, value]) => [key, Number(value) || value])
    );
    onSubmit?.({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      brand: values.brand.trim(),
      material: values.material.trim(),
      measurements,
      price: Number(values.price) || 0,
    }, intent);
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const hasErrors = Object.values(errors).some(Boolean);
  const locked = disabled || submitting;
  const canSaveDraft = !status || [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED].includes(status);
  const submitLabel = status === PRODUCT_STATUS.APPROVED
    ? 'Save for review'
    : status === PRODUCT_STATUS.PENDING
      ? 'Update pending listing'
      : 'Submit for curation';

  return (
    <form noValidate onSubmit={handleSubmit} className={cx('grid gap-10', className)}>
      {status === PRODUCT_STATUS.REJECTED && rejectionReason && (
        <div role="note" className="flex gap-3 border border-brick/40 border-l-4 border-l-brick p-4">
          <AlertIcon size={20} className="mt-0.5 shrink-0 text-brick" />
          <div>
            <p className="font-medium">The curator asked for changes</p>
            <p className="mt-1 text-sm text-brown">{rejectionReason}</p>
          </div>
        </div>
      )}

      <fieldset disabled={locked} className="contents">
        <Section title="Photos" description={`Up to ${MAX_PHOTOS} photos, ${MAX_PHOTO_MB} MB each. The first one is the cover.`}>
          <div>
            <ul role="list" className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
              {values.images.map((photo, i) => (
                <li key={photo.id} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[4/5] overflow-hidden bg-beige">
                    <img src={photo.url} alt={`Photo ${i + 1}${i === 0 ? ', cover' : ''}`} className="size-full object-cover" />
                    {i === 0 && <ProductBadge tone="strong" className="absolute bottom-1.5 left-1.5">Cover</ProductBadge>}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-1 right-1 grid size-8 place-items-center bg-cream/90 hover:bg-cream"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                  {i > 0 && (
                    <button type="button" onClick={() => makeCover(photo.id)} className="link-underline self-start text-xs">
                      Make cover
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button type="button" onClick={() => startReplace(photo.id)} className="link-underline">Replace</button>
                    <button type="button" onClick={() => movePhoto(photo.id, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="disabled:opacity-40">
                      <ChevronIcon direction="left" size={14} />
                    </button>
                    <button type="button" onClick={() => movePhoto(photo.id, 1)} disabled={i === values.images.length - 1} aria-label={`Move photo ${i + 1} later`} className="disabled:opacity-40">
                      <ChevronIcon direction="right" size={14} />
                    </button>
                  </div>
                </li>
              ))}

              {values.images.length < MAX_PHOTOS && (
                <li>
                  <button
                    id={fid('images')}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    aria-describedby={errors.images ? fid('images-error') : undefined}
                    className={cx(
                      'flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 border border-dashed px-2 text-center text-sm transition-colors hover:border-dark-brown disabled:opacity-50',
                      errors.images ? 'border-brick text-brick' : 'border-brown/75 text-brown'
                    )}
                  >
                    <UploadIcon size={22} />
                    Add photos
                  </button>
                </li>
              )}
            </ul>

            <input
              ref={fileInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={replaceInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(e) => {
                replacePhoto(e.target.files);
                e.target.value = '';
              }}
            />
            {errors.images && <p id={fid('images-error')} className="mt-2 text-sm text-brick">{errors.images}</p>}
            {photoNotes.length > 0 && (
              <ul role="status" className="mt-2 space-y-0.5 text-sm text-brick">
                {photoNotes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Details" description="What a buyer would ask before deciding.">
          <Input id={fid('title')} label="Title" required value={values.title} onChange={set('title')} error={errors.title} maxLength={80} placeholder="e.g. 90s denim chore jacket" />
          <Textarea id={fid('description')} label="Description" required rows={5} maxLength={800} showCount value={values.description} onChange={set('description')} error={errors.description} hint="Fabric, measurements, fit, and any flaws. Honest notes get approved faster." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select id={fid('categoryId')} label="Category" required placeholder="Choose a category" options={categoryOptions} value={values.categoryId} onChange={set('categoryId')} error={errors.categoryId} />
            <Input label="Brand" optional value={values.brand} onChange={set('brand')} maxLength={60} />
            <Select id={fid('size')} label="Size" required placeholder="Choose a size" options={SIZES} value={values.size} onChange={set('size')} error={errors.size} />
            <Select id={fid('condition')} label="Condition" required placeholder="Choose a condition" options={CONDITIONS} value={values.condition} onChange={set('condition')} error={errors.condition} />
            <Select label="Era" optional placeholder="Not specified" options={ERAS} value={values.era} onChange={set('era')} />
            <Input label="Material" optional value={values.material} onChange={set('material')} maxLength={120} placeholder="e.g. Cotton denim" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-dark-brown">Styles <span className="font-normal text-brown">(optional)</span></p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Styles">
              {STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  aria-pressed={values.styles.includes(style)}
                  onClick={() => toggleStyle(style)}
                  className={cx(
                    'border px-3 py-2 text-sm transition-colors',
                    values.styles.includes(style)
                      ? 'border-dark-brown bg-dark-brown text-cream'
                      : 'border-brown/60 text-dark-brown hover:bg-beige/60'
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-dark-brown">Measurements <span className="font-normal text-brown">(cm, optional)</span></p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MEASUREMENT_FIELDS.map((name) => (
                <Input
                  key={name}
                  label={name}
                  type="number"
                  min="0"
                  step="0.5"
                  inputMode="decimal"
                  suffix="cm"
                  value={values.measurements?.[name] ?? ''}
                  onChange={setMeasurement(name)}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title="Price" description="Every piece is one of a kind, so there is no quantity.">
          <Input id={fid('price')} label="Price" required prefix="Rp" type="number" inputMode="numeric" min="0" step="1000" value={values.price} onChange={set('price')} error={errors.price} wrapperClassName="max-w-xs" />
        </Section>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-beige pt-6">
        {hasErrors && (
          <p role="alert" className="text-sm text-brick">Fix the highlighted fields to continue.</p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>}
          {canSaveDraft && <Button type="submit" value="draft" variant="secondary" disabled={locked}>Save draft</Button>}
          <Button type="submit" value="submit" loading={submitting} disabled={disabled}>{submitLabel}</Button>
        </div>
      </div>
    </form>
  );
}
