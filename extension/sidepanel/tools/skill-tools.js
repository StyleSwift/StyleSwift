/**
 * StyleSwift - Skill Tools
 *
 * Tools for loading, saving, listing, and deleting style skills.
 */

// =============================================================================
// load_skill - Load domain knowledge / style skills
// =============================================================================

export const LOAD_SKILL_TOOL = {
  name: "load_skill",
  description: `Load domain knowledge or user-saved style skills.

Built-in knowledge (auto-discovered):
- frontend-design: Core design principles, DO/DON'T guidelines, AI Slop Test
- audit: Comprehensive quality audit across accessibility, performance, theming
- critique: UX-oriented design evaluation with actionable feedback
- colorize: Color palette and theming guidance
- normalize: Design normalization and consistency enforcement
- polish: Surface-level refinement and finishing touches
- distill: Strip designs to their essence by removing unnecessary complexity
- delight: Add moments of joy, personality, and unexpected touches
- animate: Enhance with purposeful animations and micro-interactions
- adapt: Adapt designs for different screen sizes, devices, or contexts
- bolder: Amplify safe or boring designs to increase visual impact

Skill templates (in style-templates/):
- dark-mode-template: Dark mode CSS template with best practices
- minimal-template: Minimalist style template

Reference knowledge (load from sub-skills):
- reference/typography: Font selection, scaling, and pairing
- reference/color-and-contrast: OKLCH, palettes, and dark mode
- reference/spatial-design: Grids, rhythm, and container queries
- reference/motion-design: Timing, easing, and reduced motion
- reference/interaction-design: Forms, focus, and loading patterns
- reference/ux-writing: Labels, errors, and empty states

User style skills (created via save_style_skill):
- Use list_style_skills to see available user skills
- Load with skill:{id} format, e.g. skill:a1b2c3d4

After loading a user style skill, generate CSS adapted to the current page's DOM structure
based on the skill's color scheme, typography, and visual effects descriptions.
Do NOT directly copy CSS selectors from the reference CSS.`,
  input_schema: {
    type: "object",
    properties: {
      skill_name: {
        type: "string",
        description: "Built-in knowledge name, or skill:{id} to load a user style skill",
      },
    },
    required: ["skill_name"],
  },
};

// =============================================================================
// save_style_skill - Save style skill
// =============================================================================

export const SAVE_STYLE_SKILL_TOOL = {
  name: "save_style_skill",
  description: `Extract visual style characteristics from the current session and save as a reusable style skill.

IMPORTANT: This tool MUST ONLY be called when the user EXPLICITLY requests it.

Only call this tool when the user says something like:
- "Save this style" / "Save current style"
- "Make this into a template" / "Create a style template"
- "I want to use this style on other sites"
- "Help me save this style skill"

DO NOT call automatically: even if you are satisfied with the current style results,
you must wait for the user's explicit request before saving.`,
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: 'Style name, e.g. "Cyberpunk", "Clean Japanese"',
      },
      mood: { type: "string", description: "One-line style description" },
      skill_content: {
        type: "string",
        description: `Style skill document (markdown format), must include:
1. Style description (natural language, overall visual feel and design philosophy)
2. Color scheme (specific color values for backgrounds, text, accents, borders)
3. Typography (font, weight, line-height preferences for headings, body, code)
4. Visual effects (border-radius, shadows, transitions, special effects)
5. Design intent (what effect the user wants to achieve, why these choices were made)
6. Reference CSS (CSS snippets from the current session, note selectors are not directly reusable)

Key: Extract abstract style characteristics, not copy specific CSS. Selectors are page-specific; colors/typography/effects are transferable.`,
      },
    },
    required: ["name", "skill_content"],
  },
};

// =============================================================================
// list_style_skills - List style skills
// =============================================================================

export const LIST_STYLE_SKILLS_TOOL = {
  name: "list_style_skills",
  description: `List all user-saved style skills.
Call this tool first when the user mentions "my saved styles" or "use my XX style".`,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// =============================================================================
// delete_style_skill - Delete style skill
// =============================================================================

export const DELETE_STYLE_SKILL_TOOL = {
  name: "delete_style_skill",
  description: "Delete a user-saved style skill.",
  input_schema: {
    type: "object",
    properties: {
      skill_id: { type: "string", description: "Skill ID to delete" },
    },
    required: ["skill_id"],
  },
};

/**
 * Skill tools handler factory
 * @param {object} deps - Dependencies
 * @param {function} deps.runLoadSkill - Load skill function
 * @param {function} deps.runSaveStyleSkill - Save style skill function
 * @param {function} deps.runListStyleSkills - List style skills function
 * @param {function} deps.runDeleteStyleSkill - Delete style skill function
 * @returns {object} Handlers for skill tools
 */
export function createSkillToolHandlers({ runLoadSkill, runSaveStyleSkill, runListStyleSkills, runDeleteStyleSkill }) {
  return {
    load_skill: async (args) => await runLoadSkill(args.skill_name),

    save_style_skill: async (args) =>
      await runSaveStyleSkill(args.name, args.mood, args.skill_content),

    list_style_skills: async () => await runListStyleSkills(),

    delete_style_skill: async (args) => await runDeleteStyleSkill(args.skill_id),
  };
}