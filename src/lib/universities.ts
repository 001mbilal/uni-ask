export type UniversitySeed = {
  id: string;
  name: string;
  city: string;
  /** Registrable domain. Subdomains (admissions.x.edu.pk) are crawled too. */
  domain: string;
  /** Where the crawl starts. Add admissions / fee pages here for better coverage. */
  seeds: string[];
  /** Short names people actually type, used to detect which university a question is about. */
  aliases: string[];
  /**
   * Exact URLs to never crawl or store. Checked before queueing so a
   * re-crawl cannot re-add an excluded document. Use for stale versioned
   * files and known personal-data documents with opaque or unique URLs.
   */
  exclude?: string[];
  /**
   * URL prefixes: any URL that starts with one of these strings is excluded.
   * Use when many related URLs share a common path prefix (e.g. all
   * merit-list PDFs under /admissions/2026/frx…).
   */
  excludePrefixes?: string[];
};

// Verify these URLs before the first crawl. Sites move pages around, and a wrong
// seed just means that university gets few or no pages indexed.
export const UNIVERSITIES: UniversitySeed[] = [
  {
    id: "nust",
    name: "National University of Sciences and Technology",
    city: "Islamabad",
    domain: "nust.edu.pk",
    // nust.edu.pk returns 403 even with browser UA; ugadmissions subdomain works
    seeds: ["https://ugadmissions.nust.edu.pk/"],
    aliases: ["nust"],
  },
  {
    id: "lums",
    name: "Lahore University of Management Sciences",
    city: "Lahore",
    domain: "lums.edu.pk",
    seeds: ["https://lums.edu.pk/", "https://admissions.lums.edu.pk/"],
    aliases: ["lums"],
  },
  {
    id: "fast",
    name: "FAST National University of Computer and Emerging Sciences",
    city: "Multiple campuses",
    domain: "nu.edu.pk",
    seeds: ["https://www.nu.edu.pk/"],
    aliases: ["fast", "fast-nuces", "fast nuces", "nuces"],
  },
  {
    id: "iba",
    name: "Institute of Business Administration Karachi",
    city: "Karachi",
    domain: "iba.edu.pk",
    seeds: ["https://www.iba.edu.pk/"],
    aliases: ["iba", "iba karachi"],
  },
  {
    id: "uok",
    name: "University of Karachi",
    city: "Karachi",
    domain: "uok.edu.pk",
    seeds: ["https://www.uok.edu.pk/", "https://admission.uok.edu.pk/"],
    aliases: ["uok", "karachi university", "university of karachi", "ku"],
    exclude: [
      // Enrolled-student seat lists (names, seat numbers); no admission info
      "https://www.uok.edu.pk/semester-fees/docs/slmpxxiv.pdf",
      "https://www.uok.edu.pk/semester-fees/docs/slepxxiv.pdf",
    ],
    excludePrefixes: [
      // Final merit lists for PG admissions 2026 (64 files, one per dept).
      // These are named-candidate interview result lists, not aggregate data.
      "https://www.uok.edu.pk/admissions/2026/frx",
    ],
  },
  {
    id: "ned",
    name: "NED University of Engineering and Technology",
    city: "Karachi",
    domain: "neduet.edu.pk",
    seeds: ["https://www.neduet.edu.pk/"],
    aliases: ["ned", "neduet", "ned university"],
    exclude: [
      // Entry-test result sheets (roll numbers + pass/fail); no admission info
      "https://www.neduet.edu.pk/sites/default/files/Admissions-2026/27aug26/TIEST_RESULTS.pdf",
      "https://www.neduet.edu.pk/sites/default/files/Admissions-2026/28-08-2026/Result_TIEST_Ph_3_SF.pdf",
      "https://www.neduet.edu.pk/sites/default/files/Admissions-2026/04-09-2026/RESULT_TIEST_PHASE-IV.pdf",
    ],
  },
  {
    id: "comsats",
    name: "COMSATS University Islamabad",
    city: "Islamabad",
    domain: "comsats.edu.pk",
    seeds: ["https://www.comsats.edu.pk/"],
    aliases: ["comsats", "cui"],
  },
  {
    id: "giki",
    name: "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology",
    city: "Topi",
    domain: "giki.edu.pk",
    seeds: ["https://giki.edu.pk/"],
    aliases: ["giki", "gik institute"],
  },
  {
    id: "aku",
    name: "Aga Khan University",
    city: "Karachi",
    domain: "aku.edu",
    seeds: ["https://www.aku.edu/"],
    aliases: ["aku", "aga khan", "aga khan university"],
  },
  {
    id: "pu",
    name: "University of the Punjab",
    city: "Lahore",
    domain: "pu.edu.pk",
    seeds: ["https://pu.edu.pk/"],
    aliases: ["pu", "punjab university", "university of the punjab"],
  },
  {
    id: "qau",
    name: "Quaid-i-Azam University",
    city: "Islamabad",
    domain: "qau.edu.pk",
    seeds: ["https://www.qau.edu.pk/"],
    aliases: ["qau", "quaid-i-azam", "quaid e azam university"],
  },
  {
    id: "uet-lahore",
    name: "University of Engineering and Technology Lahore",
    city: "Lahore",
    domain: "uet.edu.pk",
    seeds: ["https://www.uet.edu.pk/"],
    aliases: ["uet", "uet lahore"],
    exclude: [
      // Old undergraduate prospectuses (Spring 2026 ×2, Fall 2025); keeping Spring 2027 only
      "https://admission.uet.edu.pk/uploads/downloads/2f6405b8-22a6-485e-b8aa-65deefb4c942.pdf",
      "https://admission.uet.edu.pk/uploads/downloads/559fc79c-04b2-4ead-81f2-d7f9af2601a9.pdf",
      "https://admission.uet.edu.pk/uploads/downloads/1d111018-7c33-455a-9aa0-662f7c30da9e.pdf",
      // Closing merit / waiting-queue lists (individual student aggregates)
      "https://admission.uet.edu.pk/uploads/downloads/bce6493e-8fe7-4e9e-a013-92003937d908.pdf",
      "https://admission.uet.edu.pk/uploads/downloads/6b28c330-8368-43c3-809c-34f69e22422f.pdf",
      "https://admission.uet.edu.pk/uploads/downloads/0116ccde-7b9b-465b-a103-71ebc625fd6a.pdf",
    ],
  },
  {
    id: "habib",
    name: "Habib University",
    city: "Karachi",
    domain: "habib.edu.pk",
    seeds: ["https://habib.edu.pk/"],
    aliases: ["habib", "habib university"],
    exclude: [
      // Older course catalog; keeping 2025-26 only
      "https://habib.edu.pk/wp-content/uploads/2025/07/HU-Course-Catalog-2024-25.pdf",
    ],
  },
  {
    id: "ist",
    name: "Institute of Space Technology",
    city: "Islamabad",
    domain: "ist.edu.pk",
    seeds: ["https://www.ist.edu.pk/"],
    aliases: ["ist", "institute of space technology"],
  },
  {
    id: "pieas",
    name: "Pakistan Institute of Engineering and Applied Sciences",
    city: "Islamabad",
    domain: "pieas.edu.pk",
    seeds: ["https://www.pieas.edu.pk/"],
    aliases: ["pieas"],
  },
  {
    id: "au",
    name: "Air University",
    city: "Islamabad",
    domain: "au.edu.pk",
    seeds: ["https://au.edu.pk/"],
    aliases: ["air university", "au"],
  },
  {
    id: "bahria",
    name: "Bahria University",
    city: "Islamabad / Karachi",
    domain: "bahria.edu.pk",
    seeds: ["https://www.bahria.edu.pk/"],
    aliases: ["bahria", "bahria university", "bu"],
  },
  {
    id: "szabist",
    name: "Shaheed Zulfikar Ali Bhutto Institute of Science and Technology",
    city: "Karachi / Islamabad",
    domain: "szabist.edu.pk",
    seeds: ["https://szabist.edu.pk/"],
    aliases: ["szabist"],
    exclude: [
      // Older prospectus versions; keeping 2026-27 only
      "https://docs.szabist.edu.pk/websites/Prospectus/2026/Prospectus%202025-26%20(15April26).pdf",
      "https://docs.szabist.edu.pk/websites/Prospectus/2025/Prospectus%202025-26%20Final.pdf",
    ],
  },
  {
    id: "uop",
    name: "University of Peshawar",
    city: "Peshawar",
    domain: "uop.edu.pk",
    // sitemap has 279 URLs; seed the key admissions/scholarship pages directly
    seeds: [
      "https://www.uop.edu.pk/",
      "https://www.uop.edu.pk/undergraduate-admissions",
      "https://www.uop.edu.pk/Admissions",
      "https://www.uop.edu.pk/scholarships",
      "https://www.uop.edu.pk/academic-programs",
      "https://www.uop.edu.pk/higher-studies",
    ],
    aliases: ["uop", "peshawar university", "university of peshawar"],
  },
  {
    id: "muet",
    name: "Mehran University of Engineering and Technology",
    city: "Jamshoro",
    domain: "muet.edu.pk",
    seeds: ["https://www.muet.edu.pk/"],
    aliases: ["muet", "mehran", "mehran university"],
  },
  {
    id: "hec",
    name: "Higher Education Commission (scholarships, recognition, policy)",
    city: "Islamabad",
    domain: "hec.gov.pk",
    seeds: ["https://www.hec.gov.pk/"],
    aliases: ["hec", "higher education commission"],
  },
];

export const UNI_BY_ID = new Map(UNIVERSITIES.map((u) => [u.id, u]));
