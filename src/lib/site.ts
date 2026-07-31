export const SITE = {
  title: "Rotaract Bangalore East",
  subtitle: "Unite . Rise . Empower",
  description:
    "Rotaract Bangalore East is a community-based club in Bangalore. Through its service activities, RBE aims to create a positive social impact and experience the joy of giving back to the community.",
  url: "https://rotaractblreast.org",
  ogImage: "/images/site/ogimage.png",
  gaId: "G-LYQWP4N6TE",
  timezone: "Asia/Kolkata",
} as const;

/** Primary header nav — kept in code (not Sanity). Trailing slashes match site routing. */
export const PRIMARY_NAV = [
  { title: "Home", url: "/" },
  { title: "About", url: "/about/" },
  { title: "News", url: "/news/" },
  { title: "Causes", url: "/causes/" },
  { title: "Events", url: "/events/" },
  { title: "Contact", url: "/contact/" },
] as const;

export const POSTS_PER_PAGE = 9;
