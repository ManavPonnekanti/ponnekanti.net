import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import { format } from 'date-fns';

export default function(eleventyConfig) {
    //File passthroughs
    eleventyConfig.addPassthroughCopy("src/style.css");
    eleventyConfig.addPassthroughCopy({ "src/fonts/": "/" });
    eleventyConfig.addPassthroughCopy({ "src/favicon/": "/" });
    eleventyConfig.addPassthroughCopy({ "src/img/": "/" });
    eleventyConfig.addPassthroughCopy({ "node_modules/instant.page/instantpage.js": "/" });

    // Transform to add lazy loading to all images
    eleventyConfig.addTransform("lazyImages", function(content, outputPath) {
        // Only process HTML files
        if(outputPath && outputPath.endsWith(".html")) {
            // Use regex to find all img tags and add loading="lazy" attribute
            const imgRegex = /<img(?:.*?)(?:(?:src=["'](.*?)["'])(?:.*?))?>/gi;
            
            // Replace all img tags with lazy loading attribute
            const newContent = content.replace(imgRegex, function(match) {
                // Check if loading attribute already exists
                if (!match.includes('loading=')) {
                    // Add loading="lazy" right before the closing bracket
                    return match.replace(/>$/, ' loading="lazy">');
                }
                return match;
            });
            
            return newContent;
        }
        
        return content;
    });

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
            title: "Manav Ponnekanti's Blog",
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