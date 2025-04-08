import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import { format } from "date-fns";
import markdownIt from "markdown-it";
import { load } from "cheerio";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export default function (eleventyConfig) {
  // Basic pass-through & config
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy({ "src/fonts/": "/" });
  eleventyConfig.addPassthroughCopy({ "src/favicon/": "/" });
  // Remove direct passthrough for images so we can process them
  // eleventyConfig.addPassthroughCopy({ "src/img/": "/" });

  eleventyConfig.addPassthroughCopy({
    "node_modules/instant.page/instantpage.js": "/"
  });

  const markdownLib = markdownIt({ html: true, typographer: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // Date filter
  eleventyConfig.addFilter("date", (date, dateFormat) => {
    return format(date, dateFormat);
  });

  // Add a custom Nunjucks filter for ordinal dates with superscript
  eleventyConfig.addNunjucksFilter("ordinalDate", function(date) {
    const day = new Date(date).getDate();
    const suffix = ["th", "st", "nd", "rd"];
    const value = day % 100;
    const ordinal = suffix[(value - 20) % 10] || suffix[value] || suffix[0];
    return `${day}<sup>${ordinal}</sup> ${new Date(date).toLocaleString('default', { month: 'long' })} ${new Date(date).getFullYear()}`;
});

  // Collection for sorting posts by year
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./src/posts/*.md").map((post) => {
      post.data.year = new Date(post.date).getFullYear();
      return post;
    });
  });

  // RSS Feed
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: {
      name: "posts",
      limit: 0
    },
    metadata: {
      language: "en",
      title: "Manav Ponnekanti's Blog",
      base: "https://ponnekanti.net/",
      author: {
        name: "Manav Ponnekanti",
        email: "manav@ponnekanti.net"
      },
      description: "And now I see with eye serene / The very pulse of the machine"
    }
  });

  // Meta description filter
  eleventyConfig.addNunjucksFilter("metaDescription", (content) => {
    const maxLength = 160;
    let description = content
      .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, "")
      .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "")
      .replace(/<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>.*?<\/p>/gi, "")
      .replace(/(<([^>]+)>)/gi, "");

    if (description.length > maxLength) {
      description = description.substring(0, maxLength);
      const lastSpace = description.lastIndexOf(" ");
      if (lastSpace > 0) {
        description = description.substring(0, lastSpace);
      }
      description += "...";
    }
    return description;
  });

  // External links open in new tab
  eleventyConfig.addTransform("externalLinks", (content, outputPath) => {
    if (outputPath && outputPath.endsWith(".html")) {
      const $ = load(content);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.startsWith("http") && !href.includes("ponnekanti.net")) {
          $(el).attr("target", "_blank");
          $(el).attr("rel", "noopener noreferrer");
        }
      });
      return $.html();
    }
    return content;
  });

  // SINGLE TRANSFORM: Image Optimisation + Lazy Loading
  eleventyConfig.addTransform("optimizeAndLazyImages", async (content, outputPath) => {
    if (outputPath && outputPath.endsWith(".html")) {
      const $ = load(content);
      const images = $("img");

      // Based on your CSS:
      //  - Container is max 670px wide, max-height of 300px
      //  - We'll do a 1× (670×300) and 2× (1340×600) bounding box
      const boundingBoxes = [
        { suffix: "1x", width: 670, height: 300 },
        { suffix: "2x", width: 1340, height: 600 }
      ];

      // WebP quality (tweak as needed)
      const webpQuality = 80;

      const tasks = [];

      images.each((_, img) => {
        const src = $(img).attr("src");

        // Only handle local images that aren't .webp/.avif/remote
        if (
          !src ||
          src.startsWith("http") ||
          src.startsWith("data:") ||
          src.endsWith(".webp") ||
          src.endsWith(".avif")
        ) {
          // Still ensure it has lazy loading
          if (!$(img).attr("loading")) {
            $(img).attr("loading", "lazy");
          }
          return;
        }

        // If the src does not begin with '/', treat it as if it lives in src/img/...
        let cleanSrc = src;
        if (!cleanSrc.startsWith("/")) {
          // e.g. "photo.png" => "img/photo.png"
          cleanSrc = path.join("img", cleanSrc);
        }

        const inputPath = path.join("src", cleanSrc);

        if (!fs.existsSync(inputPath)) {
          console.warn(`Skipping missing image file: ${inputPath}`);
          // Ensure lazy loading if needed
          if (!$(img).attr("loading")) {
            $(img).attr("loading", "lazy");
          }
          return;
        }

        // e.g. photo.jpg => "photo" + ".jpg"
        const baseName = path.basename(src, path.extname(src));

        // Convert to .webp in two bounding boxes
        const convertTask = Promise.all(
          boundingBoxes.map(async (box) => {
            const outName = `${baseName}-${box.suffix}.webp`;
            const outPath = path.join("dist", path.dirname(src), outName);

            await sharp(inputPath)
              .resize({
                width: box.width,
                height: box.height,
                fit: "inside", // maintain aspect ratio
                withoutEnlargement: true
              })
              .webp({ quality: webpQuality })
              .toFile(outPath);
          })
        ).then(() => {
          /*
            We'll create a <picture> like:
            <picture>
              <source type="image/webp"
                      srcset="/img/photo-1x.webp 1x, /img/photo-2x.webp 2x">
              <img src="/img/photo-1x.webp" loading="lazy" alt="(existing alt)">
            </picture>
          */
          const dir = path.dirname(src);
          const webp1x = path.join("/", dir, `${baseName}-1x.webp`);
          const webp2x = path.join("/", dir, `${baseName}-2x.webp`);

          // Grab existing attributes (alt, class, etc.)
          const attributes = $(img).attr();

          // Construct a <picture> element
          const $picture = $("<picture></picture>");

          // <source> tag for .webp with 1x/2x
          $picture.append(
            `<source type="image/webp" srcset="${webp1x} 1x, ${webp2x} 2x">`
          );

          // Build the fallback <img> using the 1x webp
          const $newImg = $("<img>");
          Object.entries(attributes).forEach(([key, val]) => {
            if (key !== "src") {
              $newImg.attr(key, val);
            }
          });
          // Overwrite src with our 1x .webp
          $newImg.attr("src", webp1x);

          // Ensure lazy loading
          $newImg.attr("loading", "lazy");

          // Insert <img> into <picture>
          $picture.append($newImg);

          // Replace the old <img>
          $(img).replaceWith($picture);
        });

        tasks.push(convertTask);
      });

      await Promise.all(tasks);
      return $.html();
    }
    return content;
  });

  // Final Eleventy config
  return {
    dir: {
      input: "src",
      output: "dist"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}