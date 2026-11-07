---
title: Nav icons
description: Every collection and global gets an icon, matched from its slug.
---

With Icons set to Lucide, and always in the rail, every collection and global in the nav gets an icon. A slug containing `page`, `post`, `media`, `user`, `product`, `order`, `form`, `event` or [more than 30 other words](https://github.com/payloadpack/theme/blob/main/packages/theme/src/options/nav-icons.css) gets a matching one. Anything else gets a generic icon.

## Choose an icon

Set `--payloadpack-icon` on the nav link in your admin stylesheet. Collections have the id `nav-<slug>`, and globals `nav-global-<slug>`:

```css title="src/app/(payload)/custom.css"
#nav-recipes {
  --payloadpack-icon: url('/icons/chef-hat.svg');
}
```

Any single-color SVG works. It is used as a mask, so it takes the nav's text color. To use a Lucide icon, copy its SVG from [lucide.dev](https://lucide.dev) into `public/icons/`.
