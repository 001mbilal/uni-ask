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
  },
  {
    id: "ned",
    name: "NED University of Engineering and Technology",
    city: "Karachi",
    domain: "neduet.edu.pk",
    seeds: ["https://www.neduet.edu.pk/"],
    aliases: ["ned", "neduet", "ned university"],
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
  },
  {
    id: "habib",
    name: "Habib University",
    city: "Karachi",
    domain: "habib.edu.pk",
    seeds: ["https://habib.edu.pk/"],
    aliases: ["habib", "habib university"],
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
