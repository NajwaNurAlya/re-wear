import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { CloseIcon, UploadIcon } from '@/components/ui/icons';
import { ARTICLE_STATUS } from '@/constants';
import { formatRupiah } from '@/lib/format';

export const EDITORIAL_TOPICS = ['Guide', 'Story', 'Care', 'Seller', 'Style'];

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMPTY = {
  title: '',
  topic: '',
  excerpt: '',
  content: '',
  author: '',
  status: ARTICLE_STATUS.DRAFT,
  cover: null,
  relatedProductIds: [],
};

function blockToLine(block) {
  if (block.type === 'h2') return `## ${block.text}`;
  if (block.type === 'quote') return `> ${block.text}`;
  return block.text;
}

export function bodyToContent(body = []) {
  return body.map(blockToLine).join('\n\n');
}

export function contentToBody(content = '') {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('## ')) return { type: 'h2', text: part.slice(3).trim() };
      if (part.startsWith('> ')) return { type: 'quote', text: part.slice(2).trim() };
      return { type: 'p', text: part };
    });
}

function fromInitial(initial) {
  const article = initial ?? {};
  return {
    ...EMPTY,
    title: article.title ?? '',
    topic: article.topic ?? '',
    excerpt: article.excerpt ?? '',
    content: bodyToContent(article.body ?? []),
    author: article.author ?? '',
    status: article.status ?? ARTICLE_STATUS.DRAFT,
    cover: article.cover ? { url: article.cover } : null,
    relatedProductIds: [...(article.relatedProductIds ?? [])],
  };
}

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required.';
  if (!values.topic) errors.topic = 'Choose a category.';
  if (!values.author.trim()) errors.author = 'Author is required.';
  if (!values.content.trim()) errors.content = 'Content is required.';
  return errors;
}

export default function EditorialForm({ initialValues, products = [], submitting = false, onSubmit, onCancel }) {
  const uid = useId();
  const fileInput = useRef(null);
  const blobUrl = useRef(null);
  const [values, setValues] = useState(() => fromInitial(initialValues));
  const [errors, setErrors] = useState({});
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    setValues(fromInitial(initialValues));
  }, [initialValues]);

  useEffect(() => () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
  }, []);

  const set = (name) => (event) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const chooseFile = (fileList) => {
    const [file] = Array.from(fileList ?? []);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setImageError('Cover image must be JPG, PNG or WebP.');
      return;
    }
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    const url = URL.createObjectURL(file);
    blobUrl.current = url;
    setValues((current) => ({ ...current, cover: { id: `cover-${crypto.randomUUID()}`, url, file } }));
    setImageError('');
  };

  const removeCover = () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null;
    setValues((current) => ({ ...current, cover: { remove: true } }));
    setImageError('');
  };

  const toggleProduct = (id) => {
    setValues((current) => ({
      ...current,
      relatedProductIds: current.relatedProductIds.includes(id)
        ? current.relatedProductIds.filter((item) => item !== id)
        : [...current.relatedProductIds, id],
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const intent = event.nativeEvent.submitter?.value ?? 'save';
    const next = intent === 'draft' ? { ...values, status: ARTICLE_STATUS.DRAFT } : intent === 'publish' ? { ...values, status: ARTICLE_STATUS.PUBLISHED } : values;
    const found = validate(next);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit?.({
      title: next.title,
      topic: next.topic,
      excerpt: next.excerpt,
      author: next.author,
      status: next.status,
      cover: next.cover,
      body: contentToBody(next.content),
      relatedProductIds: next.relatedProductIds,
    }, intent);
  };

  return (
    <form onSubmit={submit} className="grid gap-8">
      <section className="grid gap-6 border-t border-beige pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <div>
          <h2 className="title">Cover</h2>
          <p className="mt-1.5 text-meta">Upload, replace or remove the editorial cover.</p>
        </div>
        <div>
          <div className="max-w-xl border border-beige bg-white/35">
            <div className="aspect-[3/2] bg-beige">
              {values.cover?.url ? <img src={values.cover.url} alt="" className="size-full object-cover" /> : <ImagePlaceholder />}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-beige p-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()} iconLeft={<UploadIcon size={16} />}>
                {values.cover?.url ? 'Replace cover' : 'Upload cover'}
              </Button>
              {values.cover?.url && (
                <Button type="button" variant="ghost" size="sm" onClick={removeCover} iconLeft={<CloseIcon size={16} />}>
                  Remove
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              chooseFile(event.target.files);
              event.target.value = '';
            }}
          />
          {imageError && <p role="alert" className="mt-2 text-sm text-brick">{imageError}</p>}
        </div>
      </section>

      <section className="grid gap-6 border-t border-beige pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <div>
          <h2 className="title">Article</h2>
          <p className="mt-1.5 text-meta">Keep the public editorial contract as block content.</p>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input id={`${uid}-title`} label="Title" required value={values.title} onChange={set('title')} error={errors.title} maxLength={120} />
            <Select id={`${uid}-topic`} label="Category" required placeholder="Choose a category" options={EDITORIAL_TOPICS} value={values.topic} onChange={set('topic')} error={errors.topic} />
            <Input id={`${uid}-author`} label="Author / Byline" required value={values.author} onChange={set('author')} error={errors.author} maxLength={80} />
            <Select
              id={`${uid}-status`}
              label="Status"
              options={[
                { value: ARTICLE_STATUS.DRAFT, label: 'Draft' },
                { value: ARTICLE_STATUS.PUBLISHED, label: 'Published' },
              ]}
              value={values.status === ARTICLE_STATUS.ARCHIVED ? ARTICLE_STATUS.DRAFT : values.status}
              onChange={set('status')}
            />
          </div>
          <Textarea label="Excerpt" rows={3} maxLength={260} showCount value={values.excerpt} onChange={set('excerpt')} />
          <Textarea
            label="Content"
            required
            rows={14}
            value={values.content}
            onChange={set('content')}
            error={errors.content}
            hint="Use blank lines between blocks. Start a heading with ## and a quote with >."
          />
        </div>
      </section>

      <section className="grid gap-6 border-t border-beige pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <div>
          <h2 className="title">Related Products</h2>
          <p className="mt-1.5 text-meta">Optional. Product ids are saved in article order.</p>
        </div>
        <div>
          {products.length ? (
            <ul className="grid gap-px border border-beige bg-beige sm:grid-cols-2">
              {products.map((product) => (
                <li key={product.id} className="bg-cream">
                  <label className="flex cursor-pointer gap-3 p-3 hover:bg-beige/35">
                    <input
                      type="checkbox"
                      checked={values.relatedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="mt-1 accent-dark-brown"
                    />
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">{product.title}</span>
                      <span className="block text-meta">{product.brand || 'No brand'} · {formatRupiah(product.price)}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-beige p-4 text-sm text-brown">No public products are available to attach.</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t border-beige pt-6">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        <Button type="submit" value="draft" variant="secondary" loading={submitting}>Save draft</Button>
        <Button type="submit" value="save" variant="secondary" loading={submitting}>Save changes</Button>
        <Button type="submit" value="publish" loading={submitting}>Publish</Button>
      </div>
    </form>
  );
}
