import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import { format } from 'date-fns';

export default function(eleventyConfig) {
    //File passthroughs
    eleventyConfig.addPassthroughCopy("src/style.css");
    eleventyConfig.addPassthroughCopy("src/favicon");
    eleventyConfig.addPassthroughCopy("src/fonts");
    eleventyConfig.addPassthroughCopy({ "src/img/": "/" });
    eleventyConfig.addPassthroughCopy({ "node_modules/instant.page/instantpage.js": "/" });

    // Add a date filter to format dates
    eleventyConfig.addFilter('date', function(date, dateFormat) {
        return format(date, dateFormat);
    });

    // Add a collection for posts with a computed `year` field
    eleventyConfig.addCollection("posts", function(collectionApi) {
        return collectionApi.getFilteredByGlob("./src/posts/*.md").map(post => {
            post.data.year = new Date(post.date).getFullYear(); // Compute year dynamically
            return post;
        });
    });

    // RSS Feed Plugin Configuration
    eleventyConfig.addPlugin(feedPlugin, {
        type: "atom",
        outputPath: "/feed.xml",
        collection: {
            name: "posts",
            limit: 0,
        },
        metadata: {
            language: "en",
            title: "Manav's Web-log",
            base: "https://ponnekanti.net/",
            author: {
                name: "Manav Ponnekanti",
                email: "manav@ponnekanti.net",
            }
        }
    });

    // Add a Nunjucks filter to generate meta descriptions
    eleventyConfig.addNunjucksFilter("metaDescription", function(content) {
        const maxLength = 160;

        // Strip HTML and clean up content
        let description = content.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, "")
                                 .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "")
                                 .replace(/<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>.*?<\/p>/gi, "")
                                 .replace(/(<([^>]+)>)/gi, "");

        // Truncate to max length
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

    // Configuration for Eleventy directories and template engines
    return {
        dir: {
            input: "src",
            output: "dist",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        dataTemplateEngine: "njk"
    };
}