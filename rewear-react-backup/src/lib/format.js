const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

// 85000 -> "Rp 85.000" (Intl inserts a non-breaking space; normalise to a plain one)
export const formatRupiah = (n) => rupiah.format(n ?? 0).replace(/\s/g, ' ');

export const formatDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
    : '';
