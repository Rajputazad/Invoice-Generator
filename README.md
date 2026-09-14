# Beyond Bikes Invoice Generator

A local-first invoice generator for Beyond Bikes built with Next.js. It creates clean printable invoices, saves invoice drafts and saved invoices in the browser, and can generate a shareable PDF.

## Features

- Password gate for access
- Blank invoice form with today's date filled automatically
- Required-field validation under each input
- Add and remove invoice line items
- Tax-inclusive totals at 9.8%
- Local draft saving with `localStorage`
- Saved invoices list stored locally in the browser
- Settings page for company, payment, tax, and footer details
- Print-ready A4 invoice layout
- PDF generation and sharing/downloading
- Responsive layout for desktop, tablet, mobile, and Safari

## Password

The app currently uses lightweight client-side password protection configured in the source code. Use server-side authentication before putting private invoice data on a public production site.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Project Structure

```text
app/
  globals.css    Global styles, print layout, responsive rules
  layout.tsx     App metadata and root layout
  page.tsx       Invoice generator, local storage, PDF generation
public/
  beyond-bikes-icon.png
  beyond-bikes-logo.png
  beyond-bikes-logo-clean.png
```

## Notes

- Invoice data is stored only in the user's browser.
- Clearing browser site data will remove local drafts and saved invoices.
- The PDF generator uses `jspdf` for a cleaner A4 PDF than browser screenshots.
