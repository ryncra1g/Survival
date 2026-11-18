/**
 * ZIP3-prefix → hazard profile table.
 *
 * Approximate, region-level ratings hand-derived from FEMA's National Risk Index
 * (county hazard ratings), NOAA hurricane landfall history, USGS seismic hazard maps
 * and IECC climate zones. Ranges are inclusive ZIP3 prefixes. When ranges overlap,
 * the LAST matching row wins, so put state-wide defaults first and local overrides after.
 *
 * Ratings: 0 = none/very low, 1 = low, 2 = moderate, 3 = high.
 * Columns: [from, to, state, climateZone, winter, heat, hurricane, flood, wildfire, earthquake, tornado, label]
 *
 * Regenerate at ZIP5/county resolution with `scripts/build-zip-table.ts` (see README).
 */
export type Rating = 0 | 1 | 2 | 3;
export type ZipRow = [number, number, string, number, Rating, Rating, Rating, Rating, Rating, Rating, Rating, string];

export const ZIP_ROWS: ZipRow[] = [
  // ---- Northeast ----
  [10, 27, "MA", 5, 2, 1, 1, 2, 0, 1, 1, "Massachusetts"],
  [25, 26, "MA", 5, 2, 1, 2, 3, 0, 1, 1, "Cape Cod & Islands"],
  [28, 29, "RI", 5, 2, 1, 2, 2, 0, 1, 1, "Rhode Island"],
  [30, 38, "NH", 6, 3, 1, 1, 2, 1, 1, 1, "New Hampshire"],
  [39, 49, "ME", 6, 3, 0, 1, 2, 1, 1, 0, "Maine"],
  [50, 59, "VT", 6, 3, 0, 0, 2, 0, 1, 0, "Vermont"],
  [60, 69, "CT", 5, 2, 1, 2, 2, 0, 1, 1, "Connecticut"],
  [64, 65, "CT", 5, 2, 1, 2, 3, 0, 1, 1, "Coastal Connecticut"],
  [70, 89, "NJ", 4, 2, 2, 2, 2, 1, 1, 1, "New Jersey"],
  [77, 87, "NJ", 4, 2, 2, 3, 3, 1, 1, 1, "Coastal New Jersey"],
  [5, 5, "NY", 4, 2, 1, 3, 3, 1, 1, 1, "Long Island"],
  [100, 149, "NY", 6, 3, 1, 1, 2, 0, 1, 1, "Upstate New York"],
  [100, 104, "NY", 4, 2, 2, 2, 3, 0, 1, 1, "New York City"],
  [105, 109, "NY", 5, 2, 1, 2, 2, 0, 1, 1, "Hudson Valley / Westchester"],
  [110, 119, "NY", 4, 2, 1, 3, 3, 1, 1, 1, "Long Island"],
  [150, 196, "PA", 5, 2, 2, 0, 2, 0, 1, 1, "Pennsylvania"],
  [190, 196, "PA", 4, 2, 2, 1, 2, 0, 1, 1, "Philadelphia area"],
  [197, 199, "DE", 4, 2, 2, 2, 3, 0, 1, 1, "Delaware"],
  // ---- Mid-Atlantic / Southeast ----
  [200, 205, "DC", 4, 1, 2, 1, 2, 0, 1, 1, "Washington, DC"],
  [206, 219, "MD", 4, 1, 2, 1, 2, 0, 1, 1, "Maryland"],
  [216, 218, "MD", 4, 1, 2, 2, 3, 0, 1, 1, "Maryland Eastern Shore"],
  [220, 246, "VA", 4, 1, 2, 1, 2, 1, 1, 1, "Virginia"],
  [233, 236, "VA", 4, 1, 2, 3, 3, 0, 1, 1, "Hampton Roads"],
  [247, 268, "WV", 5, 2, 1, 0, 3, 1, 1, 1, "West Virginia"],
  [270, 289, "NC", 4, 1, 2, 2, 2, 1, 1, 2, "North Carolina"],
  [284, 285, "NC", 3, 0, 3, 3, 3, 1, 1, 2, "Coastal North Carolina"],
  [287, 289, "NC", 5, 2, 1, 1, 2, 1, 1, 1, "Western North Carolina"],
  [290, 299, "SC", 3, 1, 3, 2, 2, 1, 2, 2, "South Carolina"],
  [294, 295, "SC", 3, 0, 3, 3, 3, 1, 2, 1, "Coastal South Carolina"],
  [300, 319, "GA", 3, 1, 3, 1, 2, 1, 1, 2, "Georgia"],
  [313, 315, "GA", 2, 0, 3, 3, 3, 1, 1, 1, "Coastal Georgia"],
  [398, 399, "GA", 3, 1, 3, 1, 2, 1, 1, 2, "Georgia"],
  [320, 349, "FL", 2, 0, 3, 3, 3, 1, 0, 1, "Florida"],
  [330, 334, "FL", 1, 0, 3, 3, 3, 1, 0, 1, "South Florida"],
  [339, 339, "FL", 1, 0, 3, 3, 3, 1, 0, 1, "Southwest Florida"],
  [349, 349, "FL", 1, 0, 3, 3, 3, 1, 0, 1, "Treasure Coast"],
  // ---- South ----
  [350, 369, "AL", 3, 1, 3, 2, 2, 1, 1, 3, "Alabama"],
  [365, 366, "AL", 2, 0, 3, 3, 3, 1, 1, 2, "Coastal Alabama"],
  [370, 385, "TN", 4, 1, 2, 0, 2, 1, 1, 3, "Tennessee"],
  [380, 381, "TN", 3, 1, 3, 0, 2, 1, 3, 3, "Memphis (New Madrid zone)"],
  [386, 397, "MS", 3, 1, 3, 2, 2, 1, 1, 3, "Mississippi"],
  [394, 395, "MS", 2, 0, 3, 3, 3, 1, 1, 2, "Mississippi Gulf Coast"],
  [400, 427, "KY", 4, 2, 2, 0, 3, 1, 1, 2, "Kentucky"],
  [420, 420, "KY", 4, 2, 2, 0, 3, 1, 3, 2, "Western Kentucky (New Madrid zone)"],
  [700, 714, "LA", 2, 0, 3, 2, 3, 1, 0, 2, "Louisiana"],
  [700, 708, "LA", 2, 0, 3, 3, 3, 0, 0, 2, "Southeast Louisiana"],
  [716, 729, "AR", 3, 1, 3, 0, 2, 1, 1, 3, "Arkansas"],
  [723, 724, "AR", 3, 1, 3, 0, 2, 1, 3, 3, "Northeast Arkansas (New Madrid zone)"],
  [730, 749, "OK", 3, 2, 3, 0, 2, 2, 2, 3, "Oklahoma"],
  [750, 799, "TX", 3, 1, 3, 1, 2, 2, 1, 2, "Texas"],
  [750, 769, "TX", 3, 1, 3, 0, 2, 2, 1, 3, "North Texas"],
  [770, 779, "TX", 2, 0, 3, 3, 3, 1, 0, 2, "Texas Gulf Coast"],
  [783, 785, "TX", 2, 0, 3, 3, 3, 1, 0, 1, "Coastal Bend / Rio Grande Valley"],
  [790, 799, "TX", 3, 2, 3, 0, 1, 3, 1, 2, "West Texas"],
  [885, 885, "TX", 3, 1, 3, 0, 1, 2, 1, 1, "El Paso"],
  // ---- Midwest ----
  [430, 458, "OH", 5, 2, 2, 0, 2, 0, 1, 2, "Ohio"],
  [460, 479, "IN", 5, 2, 2, 0, 2, 0, 1, 2, "Indiana"],
  [476, 477, "IN", 4, 2, 2, 0, 2, 0, 2, 2, "Southwest Indiana"],
  [480, 499, "MI", 5, 3, 1, 0, 2, 1, 1, 1, "Michigan"],
  [497, 499, "MI", 7, 3, 0, 0, 2, 1, 0, 1, "Northern Michigan / U.P."],
  [500, 528, "IA", 5, 3, 2, 0, 2, 0, 1, 2, "Iowa"],
  [530, 549, "WI", 6, 3, 1, 0, 2, 1, 0, 1, "Wisconsin"],
  [550, 567, "MN", 6, 3, 1, 0, 2, 1, 0, 2, "Minnesota"],
  [556, 567, "MN", 7, 3, 0, 0, 2, 1, 0, 1, "Northern Minnesota"],
  [570, 577, "SD", 6, 3, 2, 0, 2, 2, 0, 2, "South Dakota"],
  [580, 588, "ND", 7, 3, 1, 0, 2, 1, 0, 2, "North Dakota"],
  [590, 599, "MT", 6, 3, 1, 0, 2, 3, 2, 1, "Montana"],
  [600, 629, "IL", 5, 2, 2, 0, 2, 0, 1, 2, "Illinois"],
  [620, 629, "IL", 4, 2, 2, 0, 2, 0, 2, 2, "Southern Illinois"],
  [629, 629, "IL", 4, 2, 2, 0, 2, 0, 3, 2, "Southern Illinois (New Madrid zone)"],
  [630, 658, "MO", 4, 2, 2, 0, 2, 1, 1, 3, "Missouri"],
  [637, 639, "MO", 4, 1, 3, 0, 2, 1, 3, 3, "Missouri Bootheel (New Madrid zone)"],
  [660, 679, "KS", 4, 2, 3, 0, 2, 2, 1, 3, "Kansas"],
  [680, 693, "NE", 5, 3, 2, 0, 2, 1, 0, 3, "Nebraska"],
  // ---- Mountain West ----
  [800, 816, "CO", 5, 2, 1, 0, 2, 3, 1, 1, "Colorado"],
  [820, 831, "WY", 6, 3, 1, 0, 1, 2, 2, 1, "Wyoming"],
  [832, 838, "ID", 5, 3, 2, 0, 1, 3, 2, 0, "Idaho"],
  [840, 847, "UT", 5, 2, 2, 0, 1, 3, 3, 0, "Utah"],
  [850, 865, "AZ", 2, 0, 3, 0, 1, 3, 1, 0, "Arizona"],
  [855, 855, "AZ", 4, 2, 2, 0, 1, 3, 1, 0, "Arizona high country"],
  [860, 860, "AZ", 5, 2, 1, 0, 1, 3, 1, 0, "Flagstaff area"],
  [870, 884, "NM", 4, 2, 2, 0, 1, 3, 1, 1, "New Mexico"],
  [889, 898, "NV", 3, 1, 3, 0, 1, 3, 2, 0, "Nevada"],
  [894, 897, "NV", 5, 2, 1, 0, 1, 3, 3, 0, "Reno / Northern Nevada"],
  // ---- Pacific ----
  [900, 961, "CA", 3, 0, 2, 0, 2, 3, 3, 0, "California"],
  [922, 925, "CA", 2, 0, 3, 0, 1, 3, 3, 0, "Inland Empire / desert"],
  [935, 935, "CA", 3, 0, 3, 0, 1, 3, 3, 0, "Mojave / high desert"],
  [940, 951, "CA", 3, 0, 1, 0, 2, 3, 3, 0, "San Francisco Bay Area"],
  [956, 961, "CA", 4, 1, 2, 0, 2, 3, 2, 0, "Sacramento / Sierra / far north"],
  [967, 968, "HI", 1, 0, 2, 2, 2, 2, 2, 0, "Hawaii"],
  [970, 979, "OR", 4, 1, 1, 0, 2, 3, 2, 0, "Oregon"],
  [970, 974, "OR", 4, 1, 1, 0, 2, 2, 3, 0, "Western Oregon (Cascadia zone)"],
  [975, 979, "OR", 5, 2, 2, 0, 1, 3, 1, 0, "Southern & Eastern Oregon"],
  [980, 994, "WA", 4, 1, 1, 0, 2, 2, 3, 0, "Washington"],
  [988, 994, "WA", 5, 2, 2, 0, 1, 3, 1, 0, "Eastern Washington"],
  [995, 999, "AK", 7, 3, 0, 0, 2, 2, 3, 0, "Alaska"],
  // ---- Territories ----
  [6, 9, "PR", 1, 0, 3, 3, 3, 1, 2, 0, "Puerto Rico / USVI"],
  [969, 969, "GU", 1, 0, 3, 3, 3, 1, 2, 0, "Guam / Pacific territories"],
];
