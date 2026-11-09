# Riaz Salai Machine

A bilingual (English/Urdu) Next.js website for sewing machine parts, machines, repair inquiries, and shop updates. Customer inquiries are handled through WhatsApp and a saved inquiry form; the site does not take online payments.

## What is in this project

- Next.js App Router, React, TypeScript, and Tailwind CSS.
- Supabase Auth for the private administrator account.
- PostgreSQL schema, initial categories, and row-level security in `supabase/migrations/`.
- Supabase Storage for product, post, and website images.
- Public catalogue routes, product search/filter/sort, product details, posts, contact form, and shop location.
- Admin routes for products, categories, posts, inquiries, website settings, and CSV export.

The site does not contain sample inventory. The initial machine-part categories are real starter categories; add actual products and business content from the Admin Panel.

## Requirements

- Node.js 20.9 or newer (npm is included with Node.js).
- A Supabase project.
- Optional: a Vercel account for hosting, a GitHub account for source control, and a domain registrar account if you purchase `riazsewingmachine.com`.

No Supabase, Vercel, or domain credentials are included in this repository. Never send credentials in chat or commit them to source control.

## 1. Install and start locally

1. Install the current LTS release of Node.js from [nodejs.org](https://nodejs.org/), then restart VS Code.
2. Open this project folder in VS Code.
3. In the VS Code terminal, install packages:

   ```powershell
   npm install
   ```

4. Copy `.env.example` to `.env.local`.
5. Add the Supabase Project URL and the project's **publishable/anon key** to `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   These are browser-safe Supabase values. Do not put a service-role key, database password, or backup credential in any `NEXT_PUBLIC_*` variable.

6. Start the website:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000`.

Without Supabase configuration, the informational home page and WhatsApp links work, but catalogue, Admin sign-in, and inquiry storage need the database setup below.

## 2. Create and configure Supabase

1. Create a project in the Supabase dashboard and keep its database password private.
2. For a new project, open **SQL Editor** and run these migrations in order:
   - `supabase/migrations/202611010001_initial_schema.sql`
   - `supabase/migrations/202611010002_secure_public_website_settings.sql`
   - `supabase/migrations/202611010003_grant_public_content_reads.sql`
   - `supabase/migrations/202611030001_restore_admin_crud_permissions.sql`
   - `supabase/migrations/202611040001_expose_home_bottom_banner.sql`

   The first creates the relational tables, indexes, initial RLS policies, public product view, public media bucket, and eight starter categories. The second restricts public website settings to an allowlisted view while preserving Admin-only access to the settings table. The third grants public reads for the intended published content and preserves the existing Admin policies. The fourth restores the missing authenticated Admin write privileges for products and read/write privileges for inquiries and private inquiry notes; anonymous visitors can submit inquiries but cannot read or modify them. It checks that the required RLS policies are present and does not change those policies or the `public_products` view. The fifth adds only `bottom_banner_image_url` to the allowlisted public home settings while preserving the existing secure settings view and grants. For a project where the first four migrations have already been applied, run only the fifth migration. For projects at an earlier migration, continue from the first unapplied migration in order. Do not rerun an already applied migration or the initial migration.
3. The migration limits uploads to JPG, PNG, and WebP files up to 5 MB. Product, post, logo, and banner images are stored in the `business-media` bucket.
4. In **Authentication → URL Configuration**, set the Site URL to your local site while developing (`http://localhost:3000`) and add these Redirect URLs:
   - `http://localhost:3000/admin/reset-password`
   - Your eventual production URL followed by `/admin/reset-password`
5. Disable public user sign-up in **Authentication → Providers / User Signups**. Create the administrator yourself using **Authentication → Users → Add user**. Do not add a public registration page.
6. Copy the new Admin user's UUID from the Users screen. In SQL Editor, associate only that account with admin access:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE_THE_ADMIN_USER_UUID_HERE');
   ```

   Only run this for the trusted administrator. Never place an Admin password in SQL or source files.
7. Put the project URL and publishable/anon key in `.env.local`, restart `npm run dev`, and visit `/admin/login`.
8. Test password recovery with the Admin email. For recovery links to work, the redirect URL must match the Supabase Auth allow list.

The SQL uses RLS as the security boundary. The browser only receives the publishable/anon key; public writes are limited to validated inquiry inserts. The only way to authorize an Admin is the trusted SQL insert above, not a public signup flow.

## 3. Admin Panel

Go to `/admin/login` and sign in with the account created in Supabase:

- **Products:** add/edit/delete published or draft products, set price and stock, assign multiple categories, upload product images, and select the main image.
- **Categories:** add/edit/reorder/show or hide categories. Deleting a category asks for confirmation; associated product-category links are removed, but the products remain.
- **Posts:** create bilingual posts, upload images, and publish/unpublish updates.
- **Inquiries:** review customer messages, change status, save private notes, and open a WhatsApp conversation.
- **Website settings:** edit business contact data, map/Instagram links, homepage copy, logo/banner images, and bilingual About/footer text.
- **Data export:** download UTF-8 CSV files for products and categories. Product exports include private stock data and are protected by Admin authorization.

The shop address, email, and WhatsApp number are initialized with the information provided for the business. The Instagram and Google Maps links are intentionally left unset until the owner supplies the correct URLs.

## 4. Database migrations and local Supabase CLI (optional)

The SQL migration can be applied directly in Supabase SQL Editor. If you use the Supabase CLI, install it separately, link the project using its project reference, then run:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Keep Supabase CLI access tokens and database passwords out of `.env.local` values prefixed with `NEXT_PUBLIC_` and out of Git.

## 5. Production deployment on Vercel

1. Push the project to a private or public GitHub repository.
2. Import that repository into Vercel and select Next.js.
3. In Vercel **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` to the final HTTPS website origin
4. Apply any pending Supabase migrations before promoting the deployment.
5. Add the production and preview password-recovery callback URLs in Supabase Auth settings.
6. Deploy, test `/`, `/spare-parts`, `/contact`, and `/admin/login`, then configure the custom domain if purchased.

Do not add Supabase service-role or database credentials to Vercel's `NEXT_PUBLIC_*` variables.

## 6. Custom domain

The preferred domain is `riazsewingmachine.com`; this project does not assume it has been purchased. Buy it from a registrar if available, then add it under the Vercel project's **Settings → Domains**. Follow the DNS records Vercel displays for that specific project and registrar; DNS record values are project-specific and should not be guessed. Wait for verification and TLS, then update `NEXT_PUBLIC_SITE_URL` and Supabase Auth's Site URL/Redirect URLs to the verified HTTPS origin.

## 7. Backups and recovery

The migration does not claim that database backups are enabled. Before real customer data is entered:

1. Check the current Supabase plan's dashboard for available managed backup/PITR features, retention, and restore procedure. Plan features change; enable a plan that explicitly provides the recovery window the business needs.
2. The repository includes an optional scheduled GitHub Actions backup at `.github/workflows/database-backup.yml`. To enable it, use a private GitHub repository and add these **Actions secrets**:
   - `SUPABASE_DB_URL`: the database connection string from the Supabase dashboard (not the browser-safe URL/key).
   - `AGE_RECIPIENT`: the public encryption recipient generated by `age-keygen`.

   Keep the matching age private key offline in a secure password manager or encrypted recovery store. Never add it to GitHub or this repository. The workflow dumps the `public` schema, encrypts the dump before upload, and retains encrypted GitHub artifacts for 30 days. Enable Actions, check its daily run, and download older artifacts before their retention expires. GitHub artifacts are a secondary encrypted export, not a substitute for provider-managed backups or separate media backups.
3. Test a restore into a separate Supabase project before relying on the backup. A backup that has never been restored is not a verified recovery plan. The public-schema dump references Supabase Auth users; recreate the authorized Admin account before restoring if needed.
4. To restore an encrypted dump, install `age` and PostgreSQL client tools compatible with the database, download the artifact from GitHub Actions, decrypt with the offline private key, and restore to a separate/test database first. For a custom-format dump use:

   ```powershell
   age --decrypt --identity C:\secure\backup-age-key.txt .\riaz-salai-public.dump.age | pg_restore --no-owner --no-acl --dbname="$env:RESTORE_DATABASE_URL"
   ```

   Review the target URL carefully before running a restore. Restore media separately from a private backup of the Storage objects; database dumps do not include uploaded files.

Never put database passwords, dump credentials, or backup files in this repository or public Storage.

## Quality checks

After Node.js is installed and packages are restored:

```powershell
npm run typecheck
npm run lint
npm run build
```

Run these checks again after schema or application changes. Browser-driven production checks and RLS checks require a configured Supabase project and an Admin test account.
