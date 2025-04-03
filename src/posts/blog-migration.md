---
title: Migrating from Jekyll to Eleventy
date: 2022-11-20
---
***N.B.*** *If the term 'Static Site Generator' is unfamiliar to you, I recommend reading [this blogpost](https://tom.preston-werner.com/2008/11/17/blogging-like-a-hacker.html) as a primer.*

Though it may look the same, the backend of this blog has been drastically simplified. Previously, I was using the static site generator [Jekyll](https://jekyllrb.com/) to build this site, but I have now migrated to a newer, flashier, and much easier to use SSG called [Eleventy](https://www.11ty.dev/).

My requirements for a SSG are threefold:

1. **Fast build times:** Ruby is infamously slow, and even with a couple of Gems and a handful of markdown files, my build times were climbing outrageously. When used in tandem with [GitHub Pages](https://pages.github.com/), I would frequently get build errors as well. On the other hand, Eleventy is extremely stable and almost best in class speed-wise, beaten only by Hugo. Switching hosting to Netlify has also drastically increased deployment times.
2. **Simplicity and minimalism:** Jekyll has a habit of generating a bunch of difficult-to-be-rid-of CSS and folders, referencing some deeply baked-in default template. This blog is simple! I don't have any need for 90% of the features offered by most SSGs, including the use of CSS pre-processors. Eleventy is zero-config and has sane defaults: I barely have to think about the build process.
3. **Extensibility:** Eleventy works with a number of independent template languages, including Liquid, which was what all my template files were written in. The import process was seamless and the export process, if needed, is equally so. I appreciate the lack of lock-in and the portability of my writing if needed in the future.

There's a few other subsidiary things that are more or less universal amongst static site generators, such as zero telemetry, being able to write all pages in Markdown, no client-side JavaScript, and more exclusively to Eleventy, agnosticism towards directory structure.
I feel morally obliged to mention that this is largely a matter of splitting hairs and whichever SSG you choose, you will be better off than using a bloated CMS like Wordpress or the like. There are highly approachable no-code options: my favourite is [Jekyll Now](https://github.com/barryclark/jekyll-now) by Barry Clark, which is an excellent starting point. 