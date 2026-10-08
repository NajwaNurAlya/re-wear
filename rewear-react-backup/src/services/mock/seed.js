import { PRODUCT_STATUS } from '@/constants';
import { BACKGROUNDS as BG, coverArt, garmentImage, labelImage } from './artwork';

// Seed data for VITE_DATA_SOURCE=mock. Field names and enum values match the future database
// (see constants/index.js), so the Supabase adapter can return the same shapes.

// Demo accounts for the mock auth service (Step 8). Passwords are plain text here ONLY because
// this is local seed data; real accounts live in Supabase Auth (Step 12) and are never stored this way.
// The seller's id matches `sellerId` on the seeded products, so "my own listing" checks work.
export const demoUsers = [
  { id: 'buyer-demo', fullName: 'Dina Buyer', email: 'buyer@rewear.test', password: 'buyer123', role: 'buyer' },
  { id: 'seller-demo', fullName: 'Sari Seller', email: 'seller@rewear.test', password: 'seller123', role: 'seller' },
  { id: 'admin-demo', fullName: 'Adi Admin', email: 'admin@rewear.test', password: 'admin123', role: 'admin' },
];

export const categories = [
  { id: 'cat-outerwear', slug: 'outerwear', name: 'Outerwear', description: 'Jackets, coats and layers made for repeat wear.', sortOrder: 0 },
  { id: 'cat-tops', slug: 'tops', name: 'Tops', description: 'Shirts, blouses and everyday pieces for the upper half.', sortOrder: 1 },
  { id: 'cat-bottoms', slug: 'bottoms', name: 'Bottoms', description: 'Trousers, skirts and the pieces that complete a silhouette.', sortOrder: 2 },
  { id: 'cat-dresses', slug: 'dresses', name: 'Dresses', description: 'One-piece finds, from easy day dresses to occasionwear.', sortOrder: 3 },
  { id: 'cat-knitwear', slug: 'knitwear', name: 'Knitwear', description: 'Cardigans and jumpers with texture, warmth and history.', sortOrder: 4 },
  { id: 'cat-accessories', slug: 'accessories', name: 'Accessories', description: 'Bags and finishing pieces with another story to tell.', sortOrder: 5 },
];

// Each product gets a garment illustration plus a close-up of its label (the hover photo).
const piece = ({ art, bg, ...fields }) => ({
  sellerId: 'seller-demo',
  featured: false,
  status: PRODUCT_STATUS.APPROVED,
  description: fields.story, // the seller's write-up; detail page and search read `description`
  ...fields,
  images: [garmentImage({ ...art, bg }), labelImage({ brand: fields.brand, size: fields.size, color: art.color, bg })],
});

// Newest first. `featured` marks the curators' picks used on the homepage.
export const products = [
  piece({
    id: 'p-chore-jacket', title: 'Washed denim chore jacket', brand: 'Sari Denim Co.', price: 285000,
    size: 'M', era: '90s', condition: 'excellent', categoryId: 'cat-outerwear', styles: ['Workwear', 'Vintage'],
    material: 'Cotton denim', measurements: { Shoulder: 46, Chest: 112, Length: 68, Sleeve: 60 }, // centimetres, laid flat
    story: 'Worn through three monsoons in Bandung. The elbows have softened and every button is original.',
    featured: true, createdAt: '2026-10-02',
    art: { kind: 'jacket', color: '#7F94A6' }, bg: BG[0],
  }),
  piece({
    id: 'p-pleated-skirt', title: 'Pleated wool midi skirt', brand: 'Marlowe & Finch', price: 165000,
    size: 'S', era: '80s', condition: 'good', categoryId: 'cat-bottoms', styles: ['Preppy', 'Vintage'],
    material: '100% wool', measurements: { Waist: 68, Hip: 94, Length: 78 }, // centimetres, laid flat
    story: 'A school-trip skirt from the eighties, still holding every pleat.',
    featured: true, createdAt: '2026-10-01',
    art: { kind: 'skirt', color: '#6B5A52', pattern: 'check', accent: '#D7A596' }, bg: BG[1],
  }),
  piece({
    id: 'p-oat-cardigan', title: 'Ribbed knit cardigan in oatmeal', brand: 'Bandung Knitworks', price: 135000,
    size: 'L', era: '2000s', condition: 'like_new', categoryId: 'cat-knitwear', styles: ['Minimalist', 'Casual'],
    material: 'Cotton and acrylic rib knit', measurements: { Chest: 104, Length: 62, Sleeve: 58 }, // centimetres, laid flat
    story: 'Hand-finished buttons and no pilling. It looks as if it was kept in tissue paper.',
    featured: true, createdAt: '2026-09-30',
    art: { kind: 'cardigan', color: '#D9C7AC' }, bg: BG[3],
  }),
  piece({
    id: 'p-day-dress', title: 'Printed A-line day dress', brand: 'Atelier Lestari', price: 225000,
    size: 'M', era: '70s', condition: 'good', categoryId: 'cat-dresses', styles: ['Vintage'],
    material: 'Printed cotton', measurements: { Chest: 94, Waist: 76, Length: 104 }, // centimetres, laid flat
    story: 'Cut for a wedding guest in 1974. A new hem stitch, and otherwise untouched.',
    featured: true, createdAt: '2026-09-28',
    art: { kind: 'dress', color: '#EFE6D8', pattern: 'dots', accent: '#A4493D' }, bg: BG[1],
  }),
  piece({
    id: 'p-tweed-blazer', title: 'Houndstooth wool blazer', brand: 'Dunmore', price: 310000,
    size: 'L', era: '80s', condition: 'excellent', categoryId: 'cat-outerwear', styles: ['Preppy', 'Vintage'],
    material: 'Wool tweed, viscose lining', measurements: { Shoulder: 47, Chest: 110, Length: 74, Sleeve: 62 }, // centimetres, laid flat
    story: 'Heavy, lined and built for cold offices. The shoulders still hold their shape.',
    featured: true, createdAt: '2026-09-26',
    art: { kind: 'jacket', color: '#6B5A52', pattern: 'check', accent: '#E8D8CF' }, bg: BG[2],
  }),
  piece({
    id: 'p-camp-shirt', title: 'Striped short-sleeve camp shirt', brand: 'Hollis', price: 99000,
    size: 'M', era: '90s', condition: 'good', categoryId: 'cat-tops', styles: ['Casual', 'Streetwear'],
    material: 'Cotton blend', measurements: { Chest: 108, Length: 70 }, // centimetres, laid flat
    story: 'Boxy and soft from years of washing, with one tiny repair at the hem.',
    createdAt: '2026-09-24',
    art: { kind: 'shirt', color: '#B38B5D', pattern: 'stripe', accent: '#FAF6F2' }, bg: BG[3],
  }),
  piece({
    id: 'p-wide-trousers', title: 'Wide-leg pleated trousers', brand: 'Northfield', price: 175000,
    size: 'M', era: '90s', condition: 'excellent', categoryId: 'cat-bottoms', styles: ['Minimalist', 'Workwear'],
    material: 'Wool', measurements: { Waist: 74, Hip: 106, Inseam: 76, Rise: 30 }, // centimetres, laid flat
    story: 'Charcoal wool with a deep pleat and a proper hem. Hangs the way trousers used to.',
    createdAt: '2026-09-22',
    art: { kind: 'trousers', color: '#4A4543' }, bg: BG[0],
  }),
  piece({
    id: 'p-shoulder-bag', title: 'Leather shoulder bag', brand: 'Maison Reve', price: 245000,
    size: 'One Size', era: '80s', condition: 'good', categoryId: 'cat-accessories', styles: ['Vintage'],
    material: 'Leather, brass hardware', measurements: { Width: 28, Height: 22, Depth: 9, 'Strap drop': 24 }, // centimetres, laid flat
    story: 'The leather has darkened to the colour of strong tea. Original brass clasp.',
    createdAt: '2026-09-20',
    art: { kind: 'bag', color: '#8B5A44' }, bg: BG[1],
  }),
  piece({
    id: 'p-dot-blouse', title: 'Polka dot blouse', brand: 'Atelier Lestari', price: 110000,
    size: 'S', era: '70s', condition: 'good', categoryId: 'cat-tops', styles: ['Vintage'],
    material: 'Cotton voile', measurements: { Chest: 90, Length: 56 }, // centimetres, laid flat
    story: 'Light cotton with a pointed collar, cut a little short and very wearable.',
    createdAt: '2026-09-18',
    art: { kind: 'shirt', color: '#D7A596', pattern: 'dots', accent: '#FAF6F2' }, bg: BG[3],
  }),
  piece({
    id: 'p-olive-jumper', title: 'Chunky knit jumper in olive', brand: 'Northfield', price: 145000,
    size: 'XL', era: '90s', condition: 'good', categoryId: 'cat-knitwear', styles: ['Grunge', 'Casual'],
    material: 'Wool-blend knit', measurements: { Chest: 122, Length: 70, Sleeve: 62 }, // centimetres, laid flat
    story: 'Oversized the way it was meant to be. Warm, heavy and a little scratchy in a good way.',
    createdAt: '2026-09-15',
    art: { kind: 'sweater', color: '#7C7F5A' }, bg: BG[2],
  }),
  // Sold pieces are hidden from the Explore catalog (only reachable by direct link). Pending pieces never appear publicly.
  piece({
    id: 'p-flared-jeans', title: 'Low-rise flared jeans', brand: 'Sari Denim Co.', price: 150000,
    size: 'S', era: '2000s', condition: 'fair', categoryId: 'cat-bottoms', styles: ['Y2K'],
    material: 'Stretch cotton denim', measurements: { Waist: 70, Hip: 92, Inseam: 79 }, // centimetres, laid flat
    story: 'Faded at the knee and frayed at the hem, exactly as intended.',
    status: PRODUCT_STATUS.SOLD, createdAt: '2026-09-10',
    art: { kind: 'trousers', color: '#8FA3B5' }, bg: BG[0],
  }),
  piece({
    id: 'p-trucker-jacket', title: 'Corduroy trucker jacket', brand: 'Hollis', price: 260000,
    size: 'L', era: '80s', condition: 'good', categoryId: 'cat-outerwear', styles: ['Workwear'],
    material: 'Cotton corduroy', measurements: { Chest: 112, Length: 62 }, // centimetres, laid flat
    story: 'Waiting for curator review.',
    status: PRODUCT_STATUS.PENDING, createdAt: '2026-10-05',
    art: { kind: 'jacket', color: '#B38B5D' }, bg: BG[2],
  }),
];

const rack = (...items) => coverArt({ items });
const J = (color, extra) => ({ kind: 'jacket', color, ...extra });

export const articles = [
  {
    slug: 'how-to-read-a-vintage-label',
    title: 'How to read a vintage label',
    topic: 'Guide',
    author: 'Anindya Rahma',
    publishedAt: '2026-09-28',
    excerpt: 'A small woven tag can tell you the era, the maker and whether a piece has been altered. Here is what to look for before you buy.',
    cover: coverArt({ bg: BG[0], items: [{ ...J('#7F94A6'), cx: 270, s: 0.95 }, { kind: 'shirt', color: '#B38B5D', pattern: 'stripe', accent: '#FAF6F2', cx: 540, s: 0.95 }] }),
    relatedProductIds: ['p-chore-jacket', 'p-tweed-blazer', 'p-camp-shirt'],
    body: [
      { type: 'p', text: 'Before you look at the price, turn the garment inside out. The label is the most honest record a piece carries, and most of what it says is easy to read once you know where to look.' },
      { type: 'h2', text: 'Start with the fibre line' },
      { type: 'p', text: 'Sewn-in care instructions became standard through the 1970s and 80s, so a piece with none at all is often older, or was made by a very small maker. A short fibre line and nothing else is a good sign. A long list of washing symbols usually points to something newer.' },
      { type: 'p', text: 'Fibre names are worth reading too. Blends of acetate, rayon and nylon turn up often in older dresses and blouses, while heavy pure wool and cotton drill are common in workwear and tailoring.' },
      { type: 'h2', text: 'Look at how the label is attached' },
      { type: 'p', text: 'A woven label stitched down on all four sides tends to be older than a printed one or a tag held at the top edge only. The sizing system and the country of origin add more clues, but treat each one as a hint rather than proof.' },
      { type: 'quote', text: 'A label gives you a range, not a date. Two clues that agree are worth more than one that sounds certain.' },
      { type: 'h2', text: 'Check the zip and the stitching' },
      { type: 'p', text: 'Metal zips with a maker’s name on the pull are common on older pieces, and plastic coil zips arrive later in most categories. Even stitching and finished seams on the inside suggest a garment made to last, which is also what our curators look for.' },
      { type: 'p', text: 'Every piece on RE:WEAR is photographed with its label wherever it has one. It is the second photo you see when you hover over a product.' },
    ],
  },
  {
    slug: 'the-nineties-denim-jacket',
    title: 'The 90s denim jacket, one more time',
    topic: 'Story',
    author: 'Raka Pratama',
    publishedAt: '2026-09-14',
    excerpt: 'Boxy, faded and a little too big. Why the chore jacket keeps coming back, and how to tell a good one from a tired one.',
    cover: rack({ ...J('#7F94A6'), cx: 190, s: 0.86 }, { ...J('#8FA3B5'), cx: 400, s: 0.86 }, { ...J('#6F8497'), cx: 610, s: 0.86 }),
    relatedProductIds: ['p-chore-jacket', 'p-flared-jeans', 'p-wide-trousers'],
    body: [
      { type: 'p', text: 'Every few years someone declares the denim jacket finished, and every few years it is back on the rack, a little more faded than before. The version people want now is the boxy chore cut from the nineties: wide through the shoulder, short in the body, with pockets deep enough to be useful.' },
      { type: 'h2', text: 'What a good one feels like' },
      { type: 'p', text: 'Fabric first. Old denim was woven tighter and heavier, so it softens without going thin. Run a thumb along the elbows and the cuffs. If the cloth feels papery there, it has had its life.' },
      { type: 'p', text: 'Then the hardware. Original buttons that sit flat, a placket that closes without pulling, and a lining of fading that follows the way the person actually moved. That kind of wear cannot be faked, and it is why preloved denim photographs better than new.' },
      { type: 'quote', text: 'The best denim jackets have an opinion about how they should be worn.' },
      { type: 'p', text: 'Size up if you want the early-nineties shape. A medium chore jacket sits comfortably over a knit, and a large starts to read as a coat.' },
    ],
  },
  {
    slug: 'how-to-wash-what-you-thrift',
    title: 'How to wash what you thrift',
    topic: 'Care',
    author: 'Sekar Ayu',
    publishedAt: '2026-08-30',
    excerpt: 'Wool, denim and old cotton each need a different hand. A short guide to cleaning preloved clothes without undoing their age.',
    cover: rack({ kind: 'cardigan', color: '#D9C7AC', cx: 270, s: 0.95 }, { kind: 'sweater', color: '#7C7F5A', cx: 540, s: 0.95 }),
    relatedProductIds: ['p-pleated-skirt', 'p-oat-cardigan', 'p-olive-jumper'],
    body: [
      { type: 'p', text: 'A preloved piece has already survived years of washing. The goal is to keep it going, not to make it look new. A few habits do most of the work.' },
      { type: 'h2', text: 'Wool and knits' },
      { type: 'p', text: 'Wash by hand in cool water with a small amount of gentle detergent, and press the water out rather than wringing. Dry flat on a towel, away from direct sun. Hanging a wet knit stretches the shoulders for good.' },
      { type: 'h2', text: 'Denim' },
      { type: 'p', text: 'Wash it less than you think you should. When it does need it, turn it inside out, use cold water and let it dry in the shade. Heat is what shrinks the legs and cooks the colour.' },
      { type: 'h2', text: 'Old cotton and rayon' },
      { type: 'p', text: 'Test a hidden seam for colour first. Old dyes can run, and rayon weakens when wet, so handle it gently and never twist it. If a smell lingers, an hour in the open air often does more than another wash.' },
    ],
  },
  {
    slug: 'a-closet-in-bandung',
    title: 'A closet in Bandung',
    topic: 'Seller',
    author: 'Raka Pratama',
    publishedAt: '2026-08-12',
    excerpt: 'Dara Wibowo has sold secondhand clothes for six years, mostly from a spare room. She talks about sourcing, flaws and what makes a listing honest.',
    cover: rack({ kind: 'dress', color: '#EFE6D8', pattern: 'dots', accent: '#A4493D', cx: 190, s: 0.86 }, { kind: 'shirt', color: '#D7A596', pattern: 'dots', accent: '#FAF6F2', cx: 400, s: 0.86 }, { kind: 'skirt', color: '#6B5A52', pattern: 'check', accent: '#D7A596', cx: 610, s: 0.86 }),
    relatedProductIds: ['p-day-dress', 'p-dot-blouse', 'p-shoulder-bag'],
    body: [
      { type: 'p', text: 'Dara Wibowo’s spare room has a rail along one wall, a steamer in the corner and a shelf of folded knits sorted by colour. She has sold secondhand clothes from here for six years. This is a profile of how she works, written from a visit and a long conversation.' },
      { type: 'h2', text: 'Finding the pieces' },
      { type: 'p', text: 'Most of what she lists comes from family clear-outs and weekend markets. She buys slowly and says no often. If she would not wear it herself, or cannot say something true about it, it does not go on the rail.' },
      { type: 'h2', text: 'Writing an honest listing' },
      { type: 'p', text: 'Flaws go in the first line, not the last. A small moth hole, a replaced zip or a faded armpit is photographed and described. She says it saves her time in the end, because the people who buy are the ones who wanted that piece anyway.' },
      { type: 'quote', text: 'If a buyer is surprised when the parcel opens, I have written the listing badly.' },
      { type: 'p', text: 'She submits her pieces to RE:WEAR for curator review before they go live, and treats the notes she gets back as free coaching. Her most common fix, she admits, is better light.' },
    ],
  },
  {
    slug: 'four-ways-to-wear-a-pleated-midi',
    title: 'Four ways to wear a pleated midi',
    topic: 'Style',
    author: 'Sekar Ayu',
    publishedAt: '2026-07-25',
    excerpt: 'One skirt, four different afternoons. Notes on proportion, shoes and what to leave out.',
    cover: rack({ kind: 'skirt', color: '#6B5A52', pattern: 'check', accent: '#D7A596', cx: 200, s: 0.8 }, { kind: 'trousers', color: '#4A4543', cx: 400, s: 0.8 }, { kind: 'shirt', color: '#B38B5D', pattern: 'stripe', accent: '#FAF6F2', cx: 600, s: 0.8 }),
    relatedProductIds: ['p-pleated-skirt', 'p-wide-trousers', 'p-camp-shirt'],
    body: [
      { type: 'p', text: 'A pleated midi skirt does a lot of work by itself, so the rest of the outfit can stay quiet. These are four combinations that have held up for us.' },
      { type: 'h2', text: 'With a plain knit and flat shoes' },
      { type: 'p', text: 'A fitted cardigan or jumper tucked in, and loafers or low boots. The skirt supplies the movement and nothing else needs to.' },
      { type: 'h2', text: 'With a structured jacket' },
      { type: 'p', text: 'Keep the jacket cropped or boxy so the skirt’s length is still visible. Wool on wool works as long as the tones are close.' },
      { type: 'h2', text: 'With a camp shirt, untucked' },
      { type: 'p', text: 'Loose on top, pleated below. Leave the top button open and roll the sleeves once.' },
      { type: 'h2', text: 'With nothing extra' },
      { type: 'p', text: 'A white tee, bare ankles and a good bag. The easiest option, and often the best one.' },
    ],
  },
];
