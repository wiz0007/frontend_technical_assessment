# Manual Acceptance Checklist

**Status: USER-REPORTED MANUAL CHECKLIST COMPLETE — FINAL DESKTOP SPACING RECHECK PENDING**

The user has confirmed that the previously supplied manual checklist passed in their browser. Automated unit tests do not replace browser checks. For this refinement, only recheck the desktop toolbar spacing described at the end of this document.

## Authentication and route protection
- [ ] Sign in with valid DummyJSON credentials.
- [ ] Sign in with invalid credentials and confirm a useful error is displayed.
- [ ] Confirm successful login returns to the requested safe internal callback route.
- [ ] Confirm navigation recovery/retry does not submit credentials a second time.
- [ ] Refresh a protected dashboard route and confirm the session remains valid.
- [ ] Sign out, then revisit a protected route and confirm redirect to login.
- [ ] Use browser Back/Forward around login and logout.

## Users
- [ ] Open the users listing and verify the required name, email, gender, phone, and company fields.
- [ ] Search users and confirm results and total count update.
- [ ] Change page and page size; verify pagination.
- [ ] Return to a previously viewed search/page within 60 seconds and confirm cached results appear.
- [ ] Use Refresh and confirm a fresh request is made.
- [ ] Rapidly change search terms and confirm stale responses do not replace current results.
- [ ] Open a user detail page, verify details, and use Back to Users.
- [ ] Navigate quickly between user details and confirm the correct user is displayed.

## Products
- [ ] Open the products listing and verify image, title, price, category, and rating.
- [ ] Search products and verify results.
- [ ] Filter by category and verify results.
- [ ] Apply category and search together; verify both filters are respected.
- [ ] Change page and page size; verify pagination and total count.
- [ ] Return to a previously viewed filter/page within 60 seconds and confirm cached results appear.
- [ ] Use Refresh and confirm a fresh request is made.
- [ ] Open product details and verify description/specifications.
- [ ] Test carousel previous/next controls and thumbnails for a multi-image product.
- [ ] Verify fallback behaviour when an image is unavailable.
- [ ] Use Back to Products and confirm listing state is sensible.

## Responsive and visual checks
- [ ] Check desktop, tablet, and mobile viewport widths.
- [ ] Confirm no unintended horizontal overflow.
- [ ] Check navigation drawer, menus, forms, tables, cards, and carousel controls.
- [ ] Check loading, empty, and error states on both listing pages.

Record reproduction steps for any failure. Do not mark an item passed without performing it in the running application.

## Responsive layout regression checks

- [ ] At a 375px-wide viewport, the Users page itself has no horizontal scrollbar.
- [ ] On the Users page, swipe horizontally inside the table; only the table content moves and the dashboard/page header stays fixed horizontally.
- [ ] Confirm all five table columns remain readable at their normal desktop-like widths as you scroll the table.
- [ ] Confirm the table header remains aligned with the corresponding body columns while scrolling.
- [ ] On a mobile viewport, open Products directly and refresh; the page should load at device width and initial scale 1 without needing pinch-zoom to fit.
- [ ] Confirm Products cards and search/category controls do not create page-level horizontal scrolling.


## Latest responsive and search regression checks

- [ ] On desktop, Users and Products show title, inline search, and icon-only refresh in one toolbar row.
- [ ] On mobile, the title and refresh icon share the first row; search appears directly beneath without an oversized card wrapper.
- [ ] Scroll the Users list: the page toolbar remains sticky beneath the dashboard header while table rows move.
- [ ] Swipe horizontally inside the Users table: only the table viewport moves; the page itself does not gain horizontal overflow.
- [ ] Scroll Products: its title/search/category controls remain sticky while product cards move.
- [ ] Search Users for `z`: names beginning with Z appear before substring-only matches where those matches are in the returned result set.
- [ ] Search Products for `nn`: product titles beginning with `nn` rank before matches found only in the middle or secondary fields.
- [ ] Valid substring matches are still retained.
- [ ] Header account menu contains Sign Out and does not show a disabled Profile placeholder (profile editing is not in the assignment scope).
- [ ] No Sprint/version labels appear in user-facing navigation or page headings.
- [ ] At 294px viewport width, page content has no page-level horizontal scrollbar; the Users table scrolls internally.

## Products toolbar layout regression
- [ ] At desktop width, Products Catalog, search, category, Reset, and Refresh appear in one compact aligned toolbar row.
- [ ] At mobile width, controls wrap in the intended order without horizontal page overflow.
- [ ] Category selection, Reset, and Refresh remain functional after the toolbar layout change.
- [ ] The sticky toolbar remains visible while scrolling the products grid.


Responsive toolbar behaviour (v6): desktop/tablet retains the previous sticky toolbar positioning. On narrow mobile viewports the toolbar uses normal document flow, avoiding the sticky reposition/jump effect; the results below it scroll naturally. The table retains its own horizontal scroll container.

## Responsive toolbar acceptance (v7)

- At desktop, Users and Products page titles remain on the left; their controls align on the right.
- At mobile/tablet widths, the page toolbar remains pinned directly below the fixed dashboard header while the results area scrolls.
- The toolbar must not jump vertically, collapse out of view, or scroll away.
- Products toolbar controls remain in the order: search, category, reset, refresh.
- The page itself must not gain horizontal scrolling; only the users table's own container may scroll horizontally.


## Final refinement — desktop toolbar spacing

- [ ] At desktop widths (≥900px), Users and Products toolbars begin with a visible 12px gap below the fixed dashboard header; they do not touch or overlap it.
- [ ] At tablet widths (600–899px), the toolbars retain an 8px gap below the fixed header.
- [ ] At mobile widths (<600px), the previously confirmed compact placement directly below the 56px header is unchanged.
- [ ] Scroll both listing pages: the header and toolbar remain fixed, while only the results content scrolls.
