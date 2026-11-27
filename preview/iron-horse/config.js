/* Iron Horse Gun & Archery Club — site configuration.
 *
 * DEMO_MODE = true  -> the whole membership flow runs on a local demo store
 *                      (localStorage). Nothing leaves the browser. Use this to
 *                      show the owner how the flow works, with no accounts.
 *
 * DEMO_MODE = false -> the same code talks to the real Supabase project.
 *                      Fill in SUPABASE_URL and SUPABASE_ANON_KEY below
 *                      (see ../supabase/SETUP.md), set DEMO_MODE to false,
 *                      and the demo store is bypassed. No other code changes.
 *
 * The data layer in app.js (the DB object) is the only place that knows
 * about storage. Every screen calls DB.* methods; it never touches
 * localStorage or Supabase directly.
 */
const CONFIG = {
  DEMO_MODE: true,

  // Real Supabase project — fill in when the club creates one (see SETUP.md).
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY",

  CLUB: {
    name: "Iron Horse Gun & Archery Club",
    shortName: "Iron Horse",
    address: "2685 Garwood Rd, Sicklerville, NJ 08081",
    mailing: "P.O. Box 340, Blackwood, NJ 08012",
    email: "IronHorseGunClub@gmail.com",
    phone: "856-535-8622",
    founded: 1947,
    nraJoinUrl: "https://membership.nra.org/recruiters/join/XI042384",
    facebook: "https://www.facebook.com/groups/1567274403518234/",
    discord: "https://discord.gg/6Zw5ZvgABM",
    website: "https://ironhorsegunclub.com"
  },

  // Dues, exactly as printed in the 2026–2027 rule book.
  // Membership year: January 1 – December 31.
  DUES: {
    applicationFee: 25,          // per member, new members only
    individual: 225,             // per year
    family: 325,                 // per year, same address
    july4Discount: 100,          // new members joining AFTER July 4 only
    responderDiscount: 25        // renewals only: active/retired first
                                 // responders, military, veterans
  },

  // Email sending (real mode). Resend is the planned provider; the demo
  // renders the same messages in the Emails preview instead of sending.
  EMAIL: {
    from: "Iron Horse Gun & Archery Club <members@ironhorsegunclub.com>",
    provider: "resend"
  }
};
