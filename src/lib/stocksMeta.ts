// The fixed universe of 10 fake companies. This is reference data that never
// changes at runtime — prices live in the DB, everything else lives here so
// every screen renders the same identity (name/color) for a given stock.
export type StockKey =
  | "snackbox"
  | "threadline"
  | "petpal"
  | "bobaco"
  | "aerodrone"
  | "pixelworks"
  | "novamed"
  | "greengrid"
  | "voltup"
  | "cloudnine";

export interface StockMeta {
  key: StockKey;
  name: string;
  startingPrice: number;
  personality: string;
  color: string;
  sortOrder: number;
  sector: string;
  description: string;
}

// Sector + description are what make the indirect news economy solvable:
// a kid needs to be able to read "steel prices spike" and connect it to
// AeroDrone/VoltUp because their own description says they use metal.
export const STOCKS_META: StockMeta[] = [
  {
    key: "snackbox",
    name: "SnackBox",
    startingPrice: 60,
    personality: "cheap, boring, reliable",
    color: "#F4A300",
    sortOrder: 1,
    sector: "Snacks & Food",
    description:
      "Makes cheap, tasty snacks sold in stores everywhere. Uses a lot of sugar, wheat, and cardboard packaging, so ingredient and shipping costs matter a lot.",
  },
  {
    key: "threadline",
    name: "ThreadLine",
    startingPrice: 80,
    personality: "trendy, hype-driven spikes",
    color: "#E63946",
    sortOrder: 2,
    sector: "Fashion & Clothing",
    description:
      "Sells trendy clothes that come and go fast. Uses cotton fabric and depends on shipping, so trends, cotton supply, and shipping costs can swing it hard.",
  },
  {
    key: "petpal",
    name: "PetPal",
    startingPrice: 100,
    personality: "steady with seasonal bumps",
    color: "#588157",
    sortOrder: 3,
    sector: "Pet Supplies",
    description:
      "Sells pet food and toys for dogs and cats. Sales depend on pet food ingredients and get a boost around holidays and pet-adoption seasons.",
  },
  {
    key: "bobaco",
    name: "BoBaCo",
    startingPrice: 130,
    personality: "steady grower, low drama",
    color: "#A26769",
    sortOrder: 4,
    sector: "Beverages",
    description:
      "Makes boba tea and bottled drinks. Uses sugar, tapioca, and plastic cups, so ingredient and packaging costs matter.",
  },
  {
    key: "aerodrone",
    name: "AeroDrone",
    startingPrice: 160,
    personality: "high-risk, biggest swings",
    color: "#3A86FF",
    sortOrder: 5,
    sector: "Drone Technology",
    description:
      "Builds delivery drones for stores. Uses a lot of metal and battery parts, so metal prices and computer chip supply matter a lot to this company.",
  },
  {
    key: "pixelworks",
    name: "PixelWorks",
    startingPrice: 200,
    personality: "volatile, swings hard both ways",
    color: "#8338EC",
    sortOrder: 6,
    sector: "Video Games",
    description:
      "Makes video games and apps. Needs computer chips to build games and depends on how many people are buying and playing games right now.",
  },
  {
    key: "novamed",
    name: "NovaMed",
    startingPrice: 220,
    personality: "biotech moonshot, speculative, spikes or flops hard",
    color: "#FF006E",
    sortOrder: 7,
    sector: "Biotech & Medicine",
    description:
      "Researches new medicines and health treatments. Its stock can spike or crash fast based on how its lab tests and health studies turn out.",
  },
  {
    key: "greengrid",
    name: "GreenGrid",
    startingPrice: 240,
    personality: "slow-build, pays off late",
    color: "#2A9D8F",
    sortOrder: 8,
    sector: "Clean Energy",
    description:
      "Builds solar panels and clean power for homes. Needs sunlight and metal parts, and does well when the government supports clean energy.",
  },
  {
    key: "voltup",
    name: "VoltUp",
    startingPrice: 280,
    personality: "big-money feel, high starting price",
    color: "#FB8500",
    sortOrder: 9,
    sector: "Electric Vehicles",
    description:
      "Makes electric cars and batteries. Uses a lot of metal and battery materials like lithium, so metal and battery costs hit this company hard.",
  },
  {
    key: "cloudnine",
    name: "CloudNine",
    startingPrice: 330,
    personality: 'the "blue chip," slow and steady',
    color: "#457B9D",
    sortOrder: 10,
    sector: "Cloud Computing",
    description:
      "Runs computer servers that store data for other companies online. Needs a lot of electricity and depends on the internet staying up and running.",
  },
];

export const FALLBACK_DIP_KEY: StockKey = "snackbox";
export const FALLBACK_HYPE_KEY: StockKey = "threadline";
export const FALLBACK_HYPE_KEY_2: StockKey = "pixelworks"; // used if fallback hype (threadline) is itself the dip stock
