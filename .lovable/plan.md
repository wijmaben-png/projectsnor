
## Project Snor — Pre-order Landing Page

A minimalistic black & white pre-order landing page with admin dashboard and email confirmations.

### Landing page (`/`)
Pure monochrome, sharp edges, no rounded corners, no shadows, no gradients. All copy in Dutch.

Layout (centered, vertical):
1. **"Project Snor"** — bold wordmark at top
2. **Logo** — large white SVG (uploaded `FINALwitSAM.svg`) centered
3. **Headline** — "Bestel jouw shirt voor"
4. **Price** — "€27,99" prominent, oversized bold
5. **Donation note** — "Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation."
6. **Pre-order form**:
   - Volledige naam (text)
   - E-mailadres (email)
   - Telefoonnummer (tel)
   - T-shirtmaat (dropdown: S, M, L, XL)
   - Submit: **"Bestel nu"** — white bg, black text, sharp corners
7. **Success state** (replaces form after submit): "Bedankt! We nemen snel contact met je op."

Validation with zod (required fields, email format, phone digits, max lengths). Form fields styled as black inputs with white border + white text.

### Backend (Lovable Cloud)
- Table `preorders` with columns: `id` (uuid), `created_at` (timestamptz), `full_name` (text), `email` (text), `phone` (text), `tshirt_size` (text, check constraint S/M/L/XL)
- RLS: public can INSERT; only admins (via `user_roles` table with `app_role` enum + `has_role` security-definer function) can SELECT
- Roles stored in separate `user_roles` table (admin/user)

### Confirmation email (Resend)
After successful insert, invoke an edge function `send-preorder-confirmation` that emails the customer in Dutch with their order details. Requires `RESEND_API_KEY` secret — will request after approval.

### Admin (`/admin` + `/admin/login`)
- Email + password login via Lovable Cloud auth
- Protected route — non-admins are redirected
- Clean monochrome table of all preorders with Dutch headers: Datum, Naam, E-mail, Telefoon, Maat
- **"Download CSV"** button to export all submissions
- Sign-out button

### Style system
Update `index.css` to a black-and-white design system: background `0 0% 0%`, foreground `0 0% 100%`, no rounded corners (`--radius: 0`), bold sans typography. Override Button/Input/Select variants where needed for the sharp aesthetic.

### Files to create/edit
- `src/pages/Index.tsx` — landing + form
- `src/pages/AdminLogin.tsx` — login page
- `src/pages/Admin.tsx` — protected dashboard
- `src/components/PreorderForm.tsx`
- `src/assets/project-snor-logo.svg` — copied from upload
- `src/index.css`, `tailwind.config.ts` — monochrome tokens, no radius
- `src/App.tsx` — add `/admin` and `/admin/login` routes
- Migration: `preorders`, `app_role` enum, `user_roles`, `has_role()`, RLS policies
- Edge function: `supabase/functions/send-preorder-confirmation/index.ts`

### After approval I'll need
- Your **Resend API key** (for the confirmation email)
- The **email address** of the first admin account (so I can grant the admin role after you sign up)
