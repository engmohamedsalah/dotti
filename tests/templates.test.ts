import { describe, it, expect } from "vitest";
import { getTemplate, getAllTemplates } from "../src/templates/index.js";

describe("Templates", () => {
  it("should return all available templates", () => {
    const templates = getAllTemplates();
    expect(templates.length).toBe(3);
    expect(templates.map((t) => t.id)).toEqual(["react-saas", "nextjs-app", "cli-tool"]);
  });

  it("should find template by ID", () => {
    const template = getTemplate("react-saas");
    expect(template).toBeDefined();
    expect(template!.name).toBe("React SaaS");
  });

  it("should return undefined for unknown template", () => {
    const template = getTemplate("nonexistent");
    expect(template).toBeUndefined();
  });

  it("react-saas template should have agents and rules", () => {
    const template = getTemplate("react-saas")!;
    expect(template.agents.length).toBeGreaterThan(0);
    expect(template.rules.length).toBeGreaterThan(0);
    expect(template.agents.some((a) => a.id === "code-reviewer")).toBe(true);
    expect(template.rules.some((r) => r.id === "typescript-strict")).toBe(true);
  });

  it("nextjs-app template should include Next.js-specific rules", () => {
    const template = getTemplate("nextjs-app")!;
    expect(template.rules.some((r) => r.id === "nextjs-patterns")).toBe(true);
  });

  it("cli-tool template should be minimal", () => {
    const template = getTemplate("cli-tool")!;
    expect(template.agents.length).toBe(2);
    expect(template.agents.map((a) => a.id)).toEqual(["code-reviewer", "test-writer"]);
  });

  it("all templates should have valid agent data", () => {
    for (const template of getAllTemplates()) {
      for (const agent of template.agents) {
        expect(agent.id).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.triggers.length).toBeGreaterThan(0);
        expect(agent.capabilities.length).toBeGreaterThan(0);
        expect(agent.relevantFiles.length).toBeGreaterThan(0);
      }
    }
  });

  it("all templates should have valid rule data", () => {
    for (const template of getAllTemplates()) {
      for (const rule of template.rules) {
        expect(rule.id).toBeTruthy();
        expect(rule.title).toBeTruthy();
        expect(rule.content).toBeTruthy();
        expect(["high", "medium", "low"]).toContain(rule.priority);
        expect(rule.appliesTo.length).toBeGreaterThan(0);
      }
    }
  });
});
