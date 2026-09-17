import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";

it("the actual JD browser handler retries ambiguous failures with the same intent and versions", async () => {
  const handlers = new Map<string, Array<(event: unknown) => Promise<void>>>();
  const requests: Array<Record<string, unknown>> = [];
  let sequence = 0, reloads = 0;
  class Element {}
  class HTMLElement extends Element { textContent = ""; }
  class HTMLButtonElement extends HTMLElement { disabled = false; }
  class HTMLFormElement extends HTMLElement {
    dataset: Record<string, string> = { candidateId: "candidate-id" };
    values: Record<string, string> = { jd: "Complete JD", sourceUrl: "https://example.test/job",
      expectedCandidateVersion: "3", expectedJdHash: "a".repeat(64), fullTextProvided: "true" };
    status = new HTMLElement(); button = new HTMLButtonElement();
    matches(selector: string) { return selector.includes('[data-library-jd]'); }
    querySelector(selector: string) { return selector === 'button' ? this.button : this.status; }
  }
  const form = new HTMLFormElement();
  runInNewContext(readFileSync("src/web/assets/job-library.js", "utf8"), {
    Element, HTMLElement, HTMLButtonElement, HTMLFormElement,
    FormData: class { constructor(selected: HTMLFormElement) { return Object.entries(selected.values); } },
    document: { addEventListener: (kind: string, handler: (event: unknown) => Promise<void>) => {
      handlers.set(kind, [...(handlers.get(kind) ?? []), handler]);
    } },
    crypto: { randomUUID: () => `intent-${++sequence}` }, AbortSignal,
    location: { reload: () => { reloads++; } },
    fetch: async (path: string, options?: {body: string}) => {
      if (path === '/api/v1/session') return {ok:true,json:async()=>({csrfToken:'synthetic'})};
      requests.push(JSON.parse(options!.body));
      // A transport ambiguity must not cause a new logical save on retry.
      throw new Error('Ambiguous network failure');
    },
  });
  const submit = async () => {
    for (const handler of handlers.get('submit') ?? []) await handler({ target:form, preventDefault() {} });
  };
  await submit(); await submit();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toMatchObject({expectedCandidateVersion:3,expectedJdHash:'a'.repeat(64),fullTextProvided:true,intentKey:'intent-1'});
  form.values.jd = 'Edited complete JD';
  await submit();
  expect(requests[2]).toMatchObject({jd:'Edited complete JD',intentKey:'intent-2',expectedCandidateVersion:3});
  expect(form.values.jd).toBe('Edited complete JD');
  expect(form.button.disabled).toBe(false);
  expect(reloads).toBe(0);
});
