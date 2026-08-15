# Farsi Plays Database — Expansion Plan

This document outlines potential future features and expansions for the Farsi Plays Database, inspired by similar successful cataloging, theatrical, and open-source projects (such as OpenLibrary, Goodreads, TMDB, IBDB, and New Play Exchange).

## 1. Media & Attachments (Inspired by TMDB, OpenLibrary)
- **Cover Images:** Support for uploading or fetching cover images for published play editions using Supabase Storage.
- **Author/Playwright Portraits:** Gallery for playwrights and translators.
- **Production Photos/Videos:** Linking specific plays to production galleries (trailers, stage photos).
- **PDF/Excerpt Hosting:** Allowing users to upload or link to public domain PDFs or 10-page preview excerpts of the plays.

## 2. Productions & Performances (Inspired by IBDB, Theatrical Databases)
- **Production History:** A new relational table tracking notable stagings of a play (Director, Venue, Dates, Cast list).
- **Character Breakdown & Casting:** Detailed character lists (Name, Age, Gender, Description) to assist directors in finding plays for their specific ensemble sizes.
- **Awards & Nominations:** Tracking awards won by specific plays or editions (e.g., Fadjr International Theater Festival awards).

## 3. Community & Social Features (Inspired by Goodreads, Letterboxd)
- **User Reviews & Ratings:** Allowing users to rate a play (1-5 stars) and write reviews.
- **Reading/Staging Lists:** Users can create custom lists (e.g., "Plays for College Students", "Best Absurdist Iranian Plays", "Plays to Read in 2027").
- **Want to Read / Have Read / Have Staged:** Personal status tracking for plays.
- **Forums / Discussion Boards:** Integrated discussions for deep dives into specific translations or playwrights.

## 4. Advanced Discoverability (Inspired by New Play Exchange)
- **Advanced Theatrical Filters:** Search by required set complexity, specific props, period/setting, or style (Naturalism, Expressionism, etc.).
- **Monologue Finder:** Tagging specific plays that contain strong standalone monologues (filterable by gender/age).
- **Similar Plays Engine:** A recommendation system suggesting "If you liked this play, you might like..." based on tags, cast size, and genre.

## 5. Ecosystem & Open Data (Inspired by Open Data Initiatives)
- **Developer API (REST/GraphQL):** Public, rate-limited API for researchers or other apps to consume the Farsi Plays Database.
- **Bulk Export:** Allow users to download search results or the entire public dataset as CSV or JSON for academic research.
- **OAI-PMH Support:** Allow university libraries and academic archives to harvest metadata automatically.
- **i18n & Localization:** Full English UI toggle to make the database accessible to international scholars studying Persian literature.

## 6. E-Commerce & Library Integrations
- **"Where to find this" (Affiliate / Stores):** Direct links to Iranian online bookstores (e.g., 30book, iranketab) to purchase physical copies.
- **Library Holdings:** Integration with Iranian national library systems or university libraries to show where physical copies can be borrowed.

## Implementation Phasing Strategy

- **Short-term (Next 3-6 months):** Cover images (Supabase Storage), basic API, English UI toggle, "Where to buy" links.
- **Medium-term (6-12 months):** User reviews, Reading lists, Character breakdowns, Bulk exports.
- **Long-term (1-2 years):** Production history tracking, Recommender system, OAI-PMH support.
