/**
 * StyleSwift - Page Tools
 *
 * Tools for page structure analysis and element search.
 */

// =============================================================================
// get_page_structure - 获取页面结构
// =============================================================================

export const GET_PAGE_STRUCTURE_TOOL = {
  name: "get_page_structure",
  description:
    "Get the structural overview of the current page (regions, key elements, layout skeleton). " +
    "Returns a tree showing tags, selectors, and key styles at the REGION level. " +
    "This is Step 1 of the two-step exploration pipeline — use it to understand the page layout, " +
    "then call grep to drill into specific elements for full detail (exact styles, attributes, children). " +
    "IMPORTANT: get_page_structure provides an OVERVIEW only, not detailed CSS properties or leaf elements. " +
    "Always follow up with grep before writing CSS to confirm selectors and get precise style values.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// =============================================================================
// grep - 元素搜索
// =============================================================================

export const GREP_TOOL = {
  name: "grep",
  description: `Search for elements on the current page and return detailed information (full styles, attributes, children).

Search modes (auto-detected):
- CSS selector: ".sidebar", "nav > a.active", "#main h2"
- Keyword: matches in tag names, classes, IDs, text content, style values

This is the PRIMARY tool for leaf-level element inspection. Use it AFTER get_page_structure
to drill into specific regions, or proactively to verify selectors before writing CSS.

Typical uses:
- After get_page_structure overview: grep each region you plan to style to confirm
  exact selectors, computed styles, and inherited properties
- Find elements with specific style values (e.g., grep "font-size" to locate typography)
- Confirm a selector exists and count its matches before targeting it with CSS
- Discover leaf elements: regions from get_page_structure contain buttons, links,
  and text nodes that grep reveals with full detail
- Check pseudo-class states: grep for :hover styles, focus rings, or active states`,
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "CSS selector or keyword to search for" },
      scope: {
        type: "string",
        enum: ["self", "children", "subtree"],
        description:
          "Detail depth: self=matched element only (0 levels), children=with direct children (1 level), subtree=with deep children (up to 5 levels, recommended for styling)",
      },
      max_results: {
        type: "integer",
        description: "Maximum number of matching elements to return (default 5, max 20)",
      },
    },
    required: ["query"],
  },
};

/**
 * Page tools handler factory
 * @param {function} sendToContentScript - Function to send message to content script
 * @param {function} normalizeToolResult - Function to normalize tool result
 * @returns {object} Handlers for page tools
 */
export function createPageToolHandlers(sendToContentScript, normalizeToolResult) {
  return {
    get_page_structure: async (_args, context) =>
      normalizeToolResult(
        await sendToContentScript({ tool: "get_page_structure" }, context?.tabId),
      ),

    grep: async (args, context) =>
      normalizeToolResult(
        await sendToContentScript({
          tool: "grep",
          args: {
            query: args.query,
            scope: args.scope || "children",
            maxResults: args.max_results || 5,
          },
        }, context?.tabId),
      ),
  };
}